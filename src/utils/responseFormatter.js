export default {
  success: (message, data = null, meta = null) => {
    const response = {
      error: false,
      message,
    }

    if (data !== null) {
      response.data = data
    }

    if (meta !== null) {
      response.meta = meta
    }

    return response
  },
  error: (message, code = null, errors = null) => {
    const response = {
      error: true,
      message,
    }

    if (code !== null) {
      response.code = code
    }

    if (errors !== null) {
      response.errors = errors
    }

    return response
  },
  pagination: (data, totalItems, currentPage, perPage) => {
    const totalPages = Math.ceil(totalItems / perPage)

    return {
      data,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: currentPage,
        per_page: perPage,
      },
    }
  },
}
