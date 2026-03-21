import Fastify from "fastify";
import { connectRedis, redis } from "./redis";
import { config, getLogger } from "./config";

const fastify = Fastify({
  logger: getLogger(config.NODE_ENV),
});

fastify.route({
  method: "POST",
  url: "/payments",
  schema: {
    body: {
      type: "object",
      properties: {
        correlationId: {
          type: "string",
        },
        amount: {
          type: "number",
        },
      },
    },
  },
  handler: async (request, reply) => {
    const { correlationId, amount } = request.body as {
      correlationId: string;
      amount: number;
    };

    fastify.log.debug(
      `Payload: ${JSON.stringify(
        {
          correlationId,
          amount,
        },
        null,
        2
      )}`
    );

    const requestedAt = new Date().toISOString();

    const accepted = await redis.set(
      `payment:${correlationId}:accepted`,
      requestedAt,
      {
        NX: true, // Only set the key if it does not already exist
        EX: 60 * 60, // Expire time in seconds
      }
    );

    fastify.log.info(`Redis SET command: ${accepted}`);

    if (!accepted) {
      return reply.status(202).send();
    }

    // Insert hash map
    await redis.hSet(`payment:${correlationId}`, {
      correlationId,
      amount: amount.toString(),
      requestedAt,
      status: "queued",
    });

    await redis.lPush(
      "payments_queue",
      JSON.stringify({
        correlationId,
        amount,
        requestedAt,
      })
    );

    return reply.status(202).send();
  },
});

(async () => {
  try {
    await connectRedis();
    await fastify.listen({
      port: config.PORT,
      host: "0.0.0.0",
    });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
})();
