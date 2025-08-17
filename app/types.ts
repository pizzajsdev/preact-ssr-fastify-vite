import type { ComponentChildren, VNode } from 'preact'

declare global {
  namespace SSRServer {
    export type RenderRequest = (request: Request) => Promise<Response>
  }

  namespace Route {
    export type RouteModule = {
      default: (props: { data?: any; params: Record<string, string | string[]> }) => VNode<any>
      meta?: Meta
      loader?: Loader
      action?: Action
    }

    // Context passed to server-only handlers.  This includes the URL of the
    // request, dynamic parameters extracted from the pathname, and the original
    // Request object for further data (e.g. headers, body).
    export type Context<Params extends Record<string, any> = Record<string, string | string[]>> = {
      url: URL
      params: Params
      request: Request
    }

    export type Meta = (ctx: Context) => Record<string, string> | undefined
    export type Loader<T = unknown> = (ctx: Context) => Promise<T> | T
    export type Action<T = unknown> = (ctx: Context) => Promise<T> | T

    type ReturnedData<L extends () => any> = Awaited<ReturnType<L>>

    export type SerializableURL = {
      pathname: string
      search?: string
    }

    export type PageProps<
      LoaderFn extends () => any = () => any,
      ActionFn extends () => any = () => any,
      Params extends Record<string, any> = Record<string, string | string[]>,
    > = {
      url: SerializableURL
      loaderData: ReturnedData<LoaderFn>
      actionData: ReturnedData<ActionFn>
      params: Params
      meta: Record<string, string>
      children?: ComponentChildren
    }
  }
}

export {}
