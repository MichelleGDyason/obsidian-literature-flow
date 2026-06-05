export class PromiseCapability<T> {
    settled = false;
    promise: Promise<T>;
    resolve!: (data: T) => void;
    reject!: (reason?: Error) => void;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = (data) => {
                resolve(data);
                this.settled = true;
            };

            this.reject = (reason) => {
                reject(reason ?? new Error('Promise rejected'));
                this.settled = true;
            };
        });
    }
}
