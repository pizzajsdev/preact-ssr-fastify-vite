import type { ComponentChildren } from 'preact'

declare global {
  namespace Route {
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
