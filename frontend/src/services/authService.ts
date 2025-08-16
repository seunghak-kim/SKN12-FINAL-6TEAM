declare global {
  interface Window {
    google: any;
  }
}

export interface User {
  id: number;
  email: string;
  google_id: string;
  name?: string;
  profile_picture?: string;
  is_first_login: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  token_type: string;
  is_first_login: boolean;
}

class AuthService {
  private baseUrl = this.getApiUrl();
  private clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '689738363605-i65c3ar97vnts2jeh648dj3v9b23njq4.apps.googleusercontent.com';
  private isGoogleLoaded = false;

  constructor() {
    console.log('AuthService initialized with:', {
      baseUrl: this.baseUrl,
      clientId: this.clientId?.substring(0, 20) + '...'
    });
    this.initializeGoogleAuth();
  }

  private getApiUrl(): string {
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
  }

  async initializeGoogleAuth() {
    try {
      // Google API가 로드될 때까지 기다리기
      await this.waitForGoogle();
      
      // Google Identity Services 초기화
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,  // 자동 선택 비활성화 (로그아웃 후 계정 선택을 위해)
        cancel_on_tap_outside: true,  // 외부 클릭시 취소
        itp_support: true  // ITP(Intelligent Tracking Prevention) 지원
      });
      
      this.isGoogleLoaded = true;
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
    }
  }

  private waitForGoogle(): Promise<void> {
    return new Promise((resolve) => {
      if (window.google) {
        resolve();
        return;
      }
      
      const checkGoogle = () => {
        if (window.google) {
          resolve();
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      
      checkGoogle();
    });
  }


  private async handleCredentialResponse(response: any) {
    try {
      console.log('🔍 Google credential response received:', response);
      
      const loginResponse = await this.authenticateWithBackend(response.credential);
      if (loginResponse) {
        console.log('✅ Backend authentication successful:', loginResponse);
        
        // 로그인 성공 후 리디렉션 처리
        if (loginResponse.is_first_login) {
          console.log('🆕 First time user, redirecting to nickname page');
          window.location.href = '/nickname';
        } else {
          console.log('👤 Existing user, redirecting to main page');
          window.location.href = '/main';
        }
      } else {
        console.error('❌ Backend authentication failed');
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      alert('로그인 중 오류가 발생했습니다: ' + error);
    }
  }

  async signInWithGoogle(): Promise<LoginResponse | null> {
    try {
      if (!this.isGoogleLoaded) {
        await this.initializeGoogleAuth();
      }

      return new Promise((resolve) => {
        // Google 로그인 버튼 렌더링
        const buttonDiv = document.getElementById('google-signin-button');
        if (buttonDiv) {
          // Google의 표준 로그인 버튼 렌더링
          window.google.accounts.id.renderButton(
            buttonDiv,
            {
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              locale: 'ko',
              width: 300
            }
          );
        }
        
        // One Tap도 시도
        window.google.accounts.id.prompt((notification: any) => {
          console.log('Google One Tap notification:', notification);
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('One Tap not displayed, user can use the button');
          }
        });
        
        // 임시로 null 반환 (실제 로그인은 콜백에서 처리)
        resolve(null);
      });
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return null;
    }
  }

  async authenticateWithBackend(idToken: string): Promise<LoginResponse | null> {
    try {
      console.log('🔄 백엔드 인증 시작...');
      const response = await fetch(`${this.baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: idToken,
        }),
      });

      console.log('📥 백엔드 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 백엔드 인증 실패:', errorText);
        throw new Error(`Backend authentication failed: ${response.status} - ${errorText}`);
      }

      const loginResponse: LoginResponse = await response.json();
      console.log('✅ 로그인 응답:', loginResponse);
      
      // 토큰을 로컬 스토리지에 저장
      this.setAccessToken(loginResponse.access_token);
      this.setUserInfo(loginResponse.user);
      console.log('💾 토큰 및 사용자 정보 저장 완료');

      return loginResponse;
    } catch (error) {
      console.error('❌ Backend authentication failed:', error);
      return null;
    }
  }

  async completeSignup(nickname: string): Promise<User | null> {
    try {
      const token = this.getAccessToken();
      console.log('Token for signup:', token?.substring(0, 20) + '...');
      
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${this.baseUrl}/auth/complete-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: nickname,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Response error:', errorData);
        throw new Error(`Signup completion failed: ${response.status} - ${errorData}`);
      }

      const updatedUser: User = await response.json();
      this.setUserInfo(updatedUser);

      return updatedUser;
    } catch (error) {
      console.error('Signup completion failed:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = this.getAccessToken();
      if (!token) {
        return null;
      }

      const response = await fetch(`${this.baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.signOut();
        return null;
      }

      const user: User = await response.json();
      this.setUserInfo(user);

      return user;
    } catch (error) {
      console.error('Get current user failed:', error);
      this.signOut();
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('Starting sign out process...');
      
      // 1. Google 계정 자동 선택 완전히 비활성화
      if (window.google && window.google.accounts) {
        // 자동 선택 비활성화
        window.google.accounts.id.disableAutoSelect();
        console.log('Google auto-select disabled');
        
        // Google OAuth 세션 취소 (더 강력한 로그아웃)
        try {
          await window.google.accounts.id.revoke(this.getAccessToken() || '', () => {
            console.log('Google token revoked');
          });
        } catch (revokeError) {
          console.log('Google token revoke failed:', revokeError);
        }
      }
      
      // 2. 모든 Google 관련 쿠키 삭제
      this.clearGoogleCookies();
      
      // 3. 로컬 저장소 데이터 삭제
      this.clearStoredData();
      console.log('Local storage cleared');
      
      // 4. 세션 스토리지도 삭제
      sessionStorage.clear();
      
      console.log('Sign out completed successfully');
      
    } catch (error) {
      console.error('Sign out failed:', error);
      // 오류 발생 시에도 로컬 데이터 삭제
      this.clearStoredData();
      this.clearGoogleCookies();
      sessionStorage.clear();
      throw error; // 에러를 다시 던져서 Navigation에서 처리할 수 있도록
    }
  }

  private clearGoogleCookies(): void {
    try {
      // Google 관련 쿠키들을 삭제
      const cookiesToClear = [
        'g_state',
        'g_oauth_state', 
        'g_csrf_token',
        'accounts.google.com_session',
        'accounts.google.com_oauth_state',
        'SACSID',
        'APISID',
        'SSID',
        'HSID',
        'SID'
      ];
      
      cookiesToClear.forEach(cookieName => {
        // 현재 도메인에서 삭제
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        // Google 도메인에서 삭제 시도
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.google.com;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.accounts.google.com;`;
      });
      
      console.log('Google cookies cleared');
    } catch (error) {
      console.error('Failed to clear Google cookies:', error);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  isFirstLogin(): boolean {
    const user = this.getUserInfo();
    return user?.is_first_login ?? false;
  }

  private setAccessToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setUserInfo(user: User): void {
    localStorage.setItem('user_info', JSON.stringify(user));
  }

  private getUserInfo(): User | null {
    const userStr = localStorage.getItem('user_info');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private clearStoredData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
  }

  getCurrentUserId(): number | null {
    const user = this.getUserInfo();
    return user ? user.id : null;
  }
}

export const authService = new AuthService();