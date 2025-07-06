export type WebSearchProvider = {
  id: string
  name: string
  apiKey?: string
  apiHost?: string
  engines?: string[]
}

export type WebSearchResponse = {
  query?: string
  results: WebSearchResult[]
}

export type WebSearchResult = {
  title: string
  content: string
  url: string
}

export type searchResultType = "none" | "done" | "searching" | "error"