export interface RefreshToken {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    is_revoked: boolean;
    user_agent?: string | null;
    ip_address?: string | null;
    created_at: Date;
}

export type CreateRefreshTokenDTO = Omit<RefreshToken, 'is_revoked' | 'created_at'>;
