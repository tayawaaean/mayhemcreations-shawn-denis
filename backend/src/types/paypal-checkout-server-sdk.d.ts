/**
 * Type definitions for @paypal/checkout-server-sdk
 * Manual type declarations for PayPal Checkout Server SDK
 */

declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    export class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string);
    }

    export class LiveEnvironment {
      constructor(clientId: string, clientSecret: string);
    }

    export class PayPalHttpClient {
      constructor(environment: SandboxEnvironment | LiveEnvironment);
      execute(request: any): Promise<any>;
    }
  }

  export namespace orders {
    export class OrdersCreateRequest {
      constructor();
      prefer(representation: string): void;
      requestBody(body: any): void;
    }

    export class OrdersCaptureRequest {
      constructor(orderId: string);
      requestBody(body: any): void;
    }

    export class OrdersGetRequest {
      constructor(orderId: string);
    }
  }

  export interface PayPalEnvironment {
    clientId: string;
    clientSecret: string;
  }

  export interface PayPalHttpRequest {
    requestBody(body: any): void;
  }
}

