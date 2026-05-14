import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const pinoHttpMiddleware = pinoHttp as unknown as (options: {
  logger: typeof logger;
  serializers: {
    req: (req: { id?: string; method?: string; url?: string }) => {
      id: string | undefined;
      method: string | undefined;
      url: string | undefined;
    };
    res: (res: { statusCode?: number }) => {
      statusCode: number | undefined;
    };
  };
}) => express.RequestHandler;

const app: Express = express();

app.use(
  pinoHttpMiddleware({
    logger,
    serializers: {
      req(req: { id?: string; method?: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode?: number }) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
