import "dotenv/config";
import Fastify from "fastify";
import { connectRedis, redis } from "./redis";

const fastify = Fastify({
  logger: true,
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
      port: (process.env.PORT as number | undefined) || 9999,
      host: "0.0.0.0",
    });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
})();
