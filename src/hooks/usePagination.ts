import { useState } from 'react'

export const PAGE_SIZE = 10

export function serverPage(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  return {
    page: currentPage,
    totalPages,
    startIndex,
    endIndex: Math.min(startIndex + pageSize, total),
    total,
  }
}

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, items.length)

  return {
    page: currentPage,
    setPage,
    totalPages,
    startIndex,
    endIndex,
    total: items.length,
    pageItems: items.slice(startIndex, endIndex),
  }
}
