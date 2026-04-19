import {statusCodes} from "http-status-codes";
import CustomAPIError from "./Custom-api.js";

class BadRequestError extends CustomAPIError {
    constructor(message) {
        super(message);
        this.statusCode = statusCodes.BAD_REQUEST;
    }
}

export default BadRequestError;