import { config } from "./config";
import { connectRedis, redis } from "./redis";

type PaymentJob = {
  correlationId: string;
  amount: number;
  requestedAt: string;
};

async function processWithProcessor(baseUrl: string, job: PaymentJob) {
  console.log("Processing payment:", job);

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(job),
  });

  return response.ok;
}

async function dispatchPayment(
  job: PaymentJob
): Promise<"default" | "fallback"> {
  const defaultOk = await processWithProcessor(
    config.DEFAULT_PAYMENT_PROCESSOR_BASE_URL,
    job
  );

  if (defaultOk) {
    return "default";
  }

  const fallbackOk = await processWithProcessor(
    config.FALLBACK_PAYMENT_PROCESSOR_BASE_URL,
    job
  );

  if (fallbackOk) {
    return "fallback";
  }

  throw new Error("all processors failed");
}

async function markSuccess(job: PaymentJob, processor: "default" | "fallback") {
  const processedAt = new Date();

  await redis.hSet(`payment:${job.correlationId}`, {
    status: "processed",
    processor,
    processedAt: processedAt.toISOString(),
  });

  await redis.zAdd(`payments:completed:events`, {
    score: processedAt.getTime(),
    value: JSON.stringify({
      amount: job.amount,
      processor,
      correlationId: job.correlationId,
    }),
  });
  await redis.incr(`summary:${processor}:count`);
  await redis.incrByFloat(`summary:${processor}:amount`, job.amount);
}

async function requeue(job: PaymentJob) {
  await redis.rPush("payments_queue", JSON.stringify(job));
}

async function workerLoop() {
  console.log("Worker started and waiting for jobs");

  while (true) {
    let job: PaymentJob | undefined;

    try {
      const result = await redis.brPop("payments_queue", 0);

      if (!result) {
        continue;
      }

      const rawJob = result.element;
      job = JSON.parse(rawJob) as PaymentJob;

      const processor = await dispatchPayment(job);
      await markSuccess(job, processor);

      console.log("Payment processed", {
        correlationId: job.correlationId,
        processor,
      });
    } catch (error) {
      console.error("Worker loop error", error);
      if (job) {
        await requeue(job);
      }
    }
  }
}

(async () => {
  try {
    await connectRedis();
    await workerLoop();
  } catch (error) {
    console.error("Worker startup error", error);
    process.exit(1);
  }
})();
