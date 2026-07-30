import { useLocation, useSearchParams } from "react-router-dom"

export interface UrlQueryResult {
  target: string
  isJsonMode: boolean
}

export function useUrlQuery(): UrlQueryResult {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // 1. Extract target input strictly from URL query parameter 'q'
  const urlTarget = searchParams.get("q")?.trim() || ""

  // 2. Fall back to location.state.target for in-app navigation
  const stateTarget = (location.state as { target?: string })?.target?.trim() || ""

  const target = urlTarget || stateTarget

  // 3. Detect JSON output mode strictly via 'output=json'
  const isJsonMode = searchParams.get("output")?.toLowerCase() === "json"

  return { target, isJsonMode }
}
