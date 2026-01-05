import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare class NotFoundError extends ApiError {
    constructor(resource?: string);
}
export declare class ValidationError extends ApiError {
    constructor(message: string);
}
export declare class UnauthorizedError extends ApiError {
    constructor(message?: string);
}
//# sourceMappingURL=errorHandler.d.ts.map