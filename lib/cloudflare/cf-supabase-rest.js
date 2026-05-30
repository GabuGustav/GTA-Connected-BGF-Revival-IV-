import { supabaseRest, readSupabaseError } from './cf-http.js';

export async function cfFindUserByIdentifier(env, identifier) {
    const normalized = String(identifier || '').toLowerCase().trim();
    if (!normalized) return null;

    const filters = [
        ['username', normalized],
        ['player_name', identifier],
        ['gta_account_id', normalized]
    ];

    for (const [column, value] of filters) {
        const res = await supabaseRest(
            env,
            `/users?${column}=eq.${encodeURIComponent(value)}&limit=1`
        );
        if (!res.ok) continue;
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
            return rows[0];
        }
    }

    return null;
}

export async function cfGetUserRanks(env, userId) {
    const res = await supabaseRest(env, `/user_ranks?user_id=eq.${encodeURIComponent(userId)}`);
    if (!res.ok) {
        throw new Error((await readSupabaseError(res)).message || res.statusText);
    }
    return res.json();
}

export async function cfGetUserAchievements(env, userId) {
    const select = encodeURIComponent('*,achievements(*)');
    const res = await supabaseRest(
        env,
        `/user_achievements?user_id=eq.${encodeURIComponent(userId)}&select=${select}`
    );
    if (!res.ok) {
        throw new Error((await readSupabaseError(res)).message || res.statusText);
    }
    return res.json();
}

export async function cfGetUserMail(env, username, messageType = 'inbox') {
    const column = messageType === 'inbox' ? 'to_username' : 'from_username';
    const res = await supabaseRest(
        env,
        `/mail_messages?${column}=eq.${encodeURIComponent(username)}&message_type=eq.${messageType}&order=created_at.desc`
    );
    if (!res.ok) {
        throw new Error((await readSupabaseError(res)).message || res.statusText);
    }
    return res.json();
}

export async function cfGetLeaderboard(env, jobType, limit = 50, offset = 0) {
    const select = encodeURIComponent('*,users!inner(username,player_name,gta_account_id)');
    const res = await supabaseRest(
        env,
        `/user_ranks?job_type=eq.${encodeURIComponent(jobType)}&select=${select}&order=experience.desc&limit=${limit}&offset=${offset}`
    );
    if (!res.ok) {
        throw new Error((await readSupabaseError(res)).message || res.statusText);
    }
    return res.json();
}

export async function cfSendMailMessage(env, mailData) {
    const message = {
        from_username: mailData.from,
        to_username: mailData.to,
        subject: mailData.subject,
        message: mailData.message,
        read_status: false,
        message_type: 'inbox'
    };

    const inboxRes = await supabaseRest(env, '/mail_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(message)
    });
    const inboxPayload = await readSupabaseError(inboxRes);
    if (!inboxRes.ok) {
        throw new Error(inboxPayload.message || inboxPayload.error || 'Failed to send mail');
    }

    const inboxRow = Array.isArray(inboxPayload) ? inboxPayload[0] : inboxPayload;

    await supabaseRest(env, '/mail_messages', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ ...message, message_type: 'sent' })
    });

    return { inbox: inboxRow };
}

export async function cfCreatePasswordResetRequest(env, { id, username, otpCode, expiresAt }) {
    const res = await supabaseRest(env, '/password_resets', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
            id,
            username,
            otp_code: otpCode,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
        })
    });
    const payload = await readSupabaseError(res);
    if (!res.ok) throw new Error(payload.message || 'Failed to create reset request');
    return Array.isArray(payload) ? payload[0] : payload;
}

export async function cfGetPasswordResetRequest(env, otpId) {
    const res = await supabaseRest(env, `/password_resets?id=eq.${encodeURIComponent(otpId)}&limit=1`);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] || null;
}

export async function cfMarkPasswordResetVerified(env, otpId, resetToken) {
    const res = await supabaseRest(env, `/password_resets?id=eq.${encodeURIComponent(otpId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
            reset_token: resetToken,
            verified_at: new Date().toISOString()
        })
    });
    const payload = await readSupabaseError(res);
    if (!res.ok) throw new Error(payload.message || 'Failed to verify reset');
    return Array.isArray(payload) ? payload[0] : payload;
}

export async function cfConsumePasswordResetToken(env, resetToken, newPasswordHash) {
    const lookup = await supabaseRest(
        env,
        `/password_resets?reset_token=eq.${encodeURIComponent(resetToken)}&consumed_at=is.null&limit=1`
    );
    if (!lookup.ok) return null;
    const rows = await lookup.json();
    const resetRequest = rows?.[0];
    if (!resetRequest) return null;

    if (new Date() > new Date(resetRequest.expires_at)) {
        return null;
    }

    const patchUser = await supabaseRest(
        env,
        `/users?username=eq.${encodeURIComponent(resetRequest.username)}`,
        {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ password_hash: newPasswordHash })
        }
    );
    const userPayload = await readSupabaseError(patchUser);
    if (!patchUser.ok) {
        throw new Error(userPayload.message || 'Failed to update password');
    }

    await supabaseRest(env, `/password_resets?id=eq.${encodeURIComponent(resetRequest.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ consumed_at: new Date().toISOString() })
    });

    return Array.isArray(userPayload) ? userPayload[0] : userPayload;
}

export function mapRankStats(rankEntry) {
    if (!rankEntry) return null;
    return {
        level: rankEntry.level,
        experience: rankEntry.experience,
        next_level_xp: rankEntry.next_level_xp,
        title: rankEntry.title,
        stats: {
            arrests_made: rankEntry.arrests_made,
            tickets_issued: rankEntry.tickets_issued,
            pursuits_completed: rankEntry.pursuits_completed,
            patients_treated: rankEntry.patients_treated,
            lives_saved: rankEntry.lives_saved,
            response_time_avg: rankEntry.response_time_avg,
            vehicles_repaired: rankEntry.vehicles_repaired,
            custom_jobs: rankEntry.custom_jobs,
            avg_repair_time: rankEntry.avg_repair_time,
            missions_completed: rankEntry.missions_completed,
            properties_owned: rankEntry.properties_owned,
            wealth_earned: rankEntry.wealth_earned,
            time_played: rankEntry.time_played,
            time_in_service: rankEntry.time_in_service
        }
    };
}
