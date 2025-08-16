import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';

// API 기본 설정
const getApiUrl = (): string => {
  // 환경변수가 있으면 우선 사용
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 현재 도메인 기반으로 API URL 결정
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 로컬 개발 환경
    return 'http://localhost:8000';
  } else if (hostname.includes('ec2') || hostname.includes('amazonaws.com')) {
    // AWS EC2 환경
    return 'http://ec2-3-34-245-132.ap-northeast-2.compute.amazonaws.com';
  } else {
    // 기타 배포 환경 (현재 도메인 기준)
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
};

const API_BASE_URL = getApiUrl();

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 180000, // 3분으로 연장
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 인증 토큰 추가
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // 인증 오류 처리
          console.log('Authentication error');
        }
        return Promise.reject(error);
      }
    );
  }

  // GET 요청
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  // POST 요청
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  // PUT 요청
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  // DELETE 요청
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // FormData POST 요청 (파일 업로드용)
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();