// 站点公开定价接口的分辨率枚举解析。
//
// 画布以 /api/pricing 的 billing_usage_schema.resolution.enum 作为分辨率
// 权威白名单：枚举存在 → 覆盖静态能力表；usage schema 为空（档位编码在
// 模型名）→ 返回 null 表示隐藏分辨率选择器；接口不可达 → 返回 undefined
// 由调用方回退静态表。

import axios from "axios";

type PricingEntry = {
    model_name?: string;
    billing_usage_schema?: Record<string, { enum?: string[] }> | null;
};

export type ResolutionEnumResult = string[] | null | undefined;

const resolutionEnumCache = new Map<string, Promise<ResolutionEnumResult>>();

export function fetchResolutionEnum(baseUrl: string, apiKey: string, model: string): Promise<ResolutionEnumResult> {
    const key = `${baseUrl}::${model}`;
    const cached = resolutionEnumCache.get(key);
    if (cached) return cached;
    const normalized = baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
    const promise = axios
        .get<{ data?: PricingEntry[] }>(`${normalized}/api/pricing`, { timeout: 10000 })
        .then((response) => {
            const entry = (response.data.data || []).find((item) => item.model_name === model);
            if (!entry) return undefined;
            const enumValues = entry.billing_usage_schema?.resolution?.enum;
            if (Array.isArray(enumValues) && enumValues.length > 0) return enumValues;
            return null;
        })
        .catch(() => undefined);
    resolutionEnumCache.set(key, promise);
    return promise;
}
