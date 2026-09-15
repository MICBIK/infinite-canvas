// 画布素材通道：presign → 浏览器直传 → confirm → 公开读 URL。
//
// 字节不经过站点服务器；素材对象保存在站点共享桶 materials/ 前缀下，
// 按站点配置的保留期自动删除（默认 3 小时），成片不受影响。
// 鉴权复用画布渠道里已配置的用户 API key（sk-）。

import axios from "axios";

import i18n from "@/i18n";

type MaterialPresignData = {
    putUrl: string;
    getUrl: string;
    objectKey: string;
    expiresAt: number;
};

type MaterialApiEnvelope<T> = { success: boolean; message?: string; code?: string; data?: T | null };

export type MaterialUploadResult = { url: string; expiresAt: number };

/** 素材通道与站点 API 同源：去掉渠道 baseUrl 上的 /v1 后缀再拼 /api 路径。 */
function siteApiUrl(baseUrl: string, path: string) {
    const normalized = baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
    return `${normalized}${path}`;
}

/**
 * 上传一个素材文件并返回可引用的公开读 URL。
 * onProgress 回调 0-100 的直传进度。
 */
export async function uploadMaterial(
    config: { baseUrl: string; apiKey: string },
    file: Blob,
    contentType: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
): Promise<MaterialUploadResult> {
    const headers = { Authorization: `Bearer ${config.apiKey}` };
    const presign = await axios.post<MaterialApiEnvelope<MaterialPresignData>>(
        siteApiUrl(config.baseUrl, "/api/user/materials/presign"),
        { contentType, sizeBytes: file.size },
        { headers, signal },
    );
    const presignData = unwrapMaterial(presign.data, "materialsUnavailable");
    try {
        await axios.put(presignData.putUrl, file, {
            headers: { "Content-Type": contentType },
            signal,
            onUploadProgress: (event) => {
                if (!onProgress) return;
                const total = event.total || file.size;
                onProgress(total ? Math.min(100, Math.round(((event.loaded || 0) / total) * 100)) : 0);
            },
        });
    } catch (error) {
        if (axios.isCancel(error)) throw error;
        // 直传失败最常见的根因是站点桶的 CORS 未放行当前来源。
        throw new Error(i18n.t("apiErrors.materialUploadFailed"));
    }
    const confirm = await axios.post<MaterialApiEnvelope<{ url: string; expiresAt: number }>>(
        siteApiUrl(config.baseUrl, "/api/user/materials/confirm"),
        { objectKey: presignData.objectKey, sizeBytes: file.size, contentType },
        { headers, signal },
    );
    const confirmData = unwrapMaterial(confirm.data, "materialsUnavailable");
    return { url: confirmData.url, expiresAt: confirmData.expiresAt };
}

function unwrapMaterial<T>(payload: MaterialApiEnvelope<T> | undefined, fallbackKey: string): T {
    if (payload?.success && payload.data) return payload.data;
    throw new Error(materialErrorKey(payload?.code) || i18n.t(`apiErrors.${fallbackKey}`));
}

/** 把站点稳定错误码映射成 i18n 文案键，未识别时回 "" 由调用方兜底。 */
export function materialErrorKey(code: string | undefined): string {
    switch (code) {
        case "materials_quota_exceeded":
            return i18n.t("apiErrors.materialQuotaExceeded");
        case "materials_not_configured":
            return i18n.t("apiErrors.materialsUnavailable");
        case "materials_upload_missing":
            return i18n.t("apiErrors.materialUploadMissing");
        case "materials_size_mismatch":
            return i18n.t("apiErrors.materialUploadFailed");
        case "materials_invalid_request":
            return i18n.t("apiErrors.materialInvalidRequest");
        default:
            return "";
    }
}
