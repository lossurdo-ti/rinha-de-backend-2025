import { connectRedis, redis } from "./redis";

type PaymentJob = {
  correlationId: string;
  amount: number;
  requestedAt: string;
};

async function processPayment(job: PaymentJob) {
  console.log("Processing payment:", job);

  await redis.hSet(`payment:${job.correlationId}`, {
    status: "processed",
    processor: "unknown",
    processedAt: new Date().toISOString(),
  });
}

async function workerLoop() {
  console.log("Worker started and waiting for jobs");

  while (true) {
    try {
      const result = await redis.brPop("payments_queue", 0);

      if (!result) {
        continue;
      }

      const rawJob = result.element;
      const job = JSON.parse(rawJob) as PaymentJob;

      await processPayment(job);
    } catch (error) {
      console.error("Worker loop error", error);
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
