import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
      message
    });
  }

  static error(res: Response, error: string, statusCode: number = 500, details?: any): void {
    res.status(statusCode).json({
      success: false,
      error,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    });
  }

  static notFound(res: Response, resource: string = 'Resource'): void {
    res.status(404).json({
      success: false,
      error: `${resource} not found`
    });
  }

  static badRequest(res: Response, message: string = 'Bad request'): void {
    res.status(400).json({
      success: false,
      error: message
    });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    res.status(401).json({
      success: false,
      error: message
    });
  }

  static forbidden(res: Response, message: string = 'Forbidden'): void {
    res.status(403).json({
      success: false,
      error: message
    });
  }
}