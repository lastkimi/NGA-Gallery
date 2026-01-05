export declare const config: {
    port: number;
    nodeEnv: string;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        pool: {
            min: number;
            max: number;
        };
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    images: {
        thumbnailSize: number;
        previewWidth: number;
        quality: number;
    };
    cors: {
        origin: string;
    };
};
//# sourceMappingURL=index.d.ts.map