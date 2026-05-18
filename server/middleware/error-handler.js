import { StatusCodes } from "http-status-codes";

const errorHandlerMiddleware = (err, req, res) => {
    const defaultError = {
        statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        message: err.message || "Something went wrong, try again later"
    };
    if(err.name === "ValidationError"){
        defaultError.statusCode = StatusCodes.BAD_REQUEST;
        defaultError.message = Object.values(err.errors).map((item) => item.message).join(", ");
    }
    if(err.code && err.code === 11000){
        defaultError.statusCode = StatusCodes.BAD_REQUEST;
        defaultError.message = `Duplicate value entered for ${Object.keys(err.keyValue)} field, please choose unique value`;
    }
    if(err.name === "CastError"){
        defaultError.statusCode = StatusCodes.BAD_REQUEST;
        defaultError.message = `No item found with id : ${err.value}`;
    }


    res.status(defaultError.statusCode).json({ message: defaultError.message });
}

export default errorHandlerMiddleware;