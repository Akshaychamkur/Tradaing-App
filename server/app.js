import "express-async-errors" ;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {createServer} from 'http';
import swaggerUI from 'swagger-ui-express';
import YAML from 'yamljs';
import connectDB from './db/connect.js';
import authRouter from './routes/auth.js';
import {dirname} from './utils.js';
import {fileURLToPath} from 'url';
import notFoundMiddleware from './middleware/not-found.js';
import errorHandlerMiddleware from './middleware/error-handler.js';
import { join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());

const httpServer = createServer(app);

app.get("/", (req, res) => {
    res.send("<h1>Welcome to Tradaing App API</h1><a href='/api-docs'>API Documentation</a>");
});

//Swagger Documentation
const swaggerDocument = YAML.load(join(__dirname, "./docs/swagger.yaml"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

//Routes
app.use("/auth", authRouter);

//Middlewares
app.use(cors());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

//Start Server
const start = async()=>{
    try {
        await connectDB(process.env.MONGO_URI);
        const PORT = process.env.PORT || 3000;
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.log(error);
    }
}