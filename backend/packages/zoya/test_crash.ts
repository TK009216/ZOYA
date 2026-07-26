import { Effect } from "effect";
import { Server } from "./src/server/server";

const program = Effect.gen(function* () {
  console.log("Starting server...");
  try {
    const server = yield* Effect.promise(() => Server.listen({ port: 25810, hostname: "127.0.0.1" }));
    console.log("Server started on port 25810");
  } catch (e) {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  }
});

Effect.runPromise(program);
