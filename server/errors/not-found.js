import {statusCodes} from "http-status-codes";
import CustomAPIError from "./Custom-api.js";

class NotFoundError extends CustomAPIError {
    constructor(message) {
        super(message);
        this.statusCode = statusCodes.NOT_FOUND;
    }
}

export default NotFoundError;