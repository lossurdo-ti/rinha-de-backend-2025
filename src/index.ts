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

    fastify.log.info({
      correlationId,
      amount,
    });

    await redis.lPush(
      "payments_queue",
      JSON.stringify({
        correlationId,
        amount,
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
