// shared/constants/apiRoutes.ts
export const API_BASE = {
  PRODUCTS: "/api/products",
  AUTH: "/api/auth",
};

// CLIENT-SIDE usage (full paths)
export const API_ROUTES = {
  PRODUCTS: {
    SEARCH: `${API_BASE.PRODUCTS}/search`,
    ADD_PRODUCT: `${API_BASE.PRODUCTS}/addproduct`,
    EDIT_PRODUCT: `${API_BASE.PRODUCTS}/editproduct`,
    TOGGLE_PRODUCT: `${API_BASE.PRODUCTS}/toggleproduct`,
    GET_PRODUCT: `${API_BASE.PRODUCTS}/product`,
    GET_OPTIONS: `${API_BASE.PRODUCTS}/getoptions`,
    GET_FREQUENT_TAGS: `${API_BASE.PRODUCTS}/freqprodtags`,
    GET_SEARCH_TAGS: `${API_BASE.PRODUCTS}/searchtags`,
    ADD_OPTIONS: `${API_BASE.PRODUCTS}/addoptions`,
  },
  AUTH: {
    // add the login, logout, and get user routes
    LOGIN: `${API_BASE.AUTH}/login`,
    LOGOUT: `${API_BASE.AUTH}/logout`,
    GET_USER: `${API_BASE.AUTH}/user`,
    GET_PFP: `${API_BASE.AUTH}/getpfp`,
    SET_PFP: `${API_BASE.AUTH}/setpfp`,
  },
};

// SERVER-SIDE usage (relative paths for router definitions)
export const API_PATHS = {
  PRODUCTS: {
    SEARCH: '/search',
    ADD_PRODUCT: '/addproduct',
    EDIT_PRODUCT: '/editproduct',
    TOGGLE_PRODUCT: '/toggleproduct',
    GET_PRODUCT: '/product',
    GET_OPTIONS: '/getoptions',
    GET_FREQUENT_TAGS: '/freqprodtags',
    GET_SEARCH_TAGS: '/searchtags',
    ADD_OPTIONS: '/addoptions',
  },
  AUTH: {
    // add the login, logout, and get user paths
    LOGIN: '/login',
    LOGOUT: '/logout',
    GET_USER: '/user',
    GET_PFP: '/getpfp',
    SET_PFP: '/setpfp',
  },
};