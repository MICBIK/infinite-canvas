// 站内视频模型静态能力表与门控规则。
//
// 分辨率的唯一权威来源是站点 /api/pricing 返回的
// billing_usage_schema.resolution.enum：枚举存在时只渲染枚举值，
// 枚举缺失（或 usage schema 为空）时隐藏分辨率选择器（档位编码在模型名里）。
// 下面的静态表只负责时长窗口、素材上限与提交负载形态，并在
// pricing 数据不可用时兜底分辨率选项。
//
// 界面文案不得出现任何上游供应商名，这里也只保留模型名与中性负载命名。

export type VideoPayloadStyle = "grok" | "seedance" | "sora";

export type VideoDurationSpec =
    | { mode: "range"; min: number; max: number; default: number }
    | { mode: "discrete"; values: number[]; default: number };

export interface VideoMaterialLimits {
    images: number;
    videos: number;
    audios: number;
    /** 素材总数上限（未设置则不限制总数）。 */
    total?: number;
}

export interface VideoModelCapability {
    /** 提交负载形态：JSON 字段名随模型族不同。 */
    payload: VideoPayloadStyle;
    /** 静态分辨率枚举；null 表示固定分辨率模型（隐藏选择器）。 */
    resolutions: string[] | null;
    /** 固定分辨率模型的提交档位：选择器隐藏，但负载仍必须携带。 */
    fixedResolution?: string;
    duration: VideoDurationSpec;
    /** 分辨率不同时时长窗口不同（如 sd-mini）。 */
    durationByResolution?: Record<string, { min: number; max: number; default: number }>;
    materials: VideoMaterialLimits;
    /** 挂参考图后允许的最高分辨率（如 grok-imagine-video-1.5 的 720p）。 */
    referenceResolutionCap?: string;
    /** 单张起始图模式（提交为 image 字段，与参考图组互斥）。 */
    singleImageMode?: boolean;
    /** 是否展示画幅比例选择。 */
    aspectRatios: string[];
}

export const VIDEO_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"];

const range = (min: number, max: number, def: number): VideoDurationSpec => ({ mode: "range", min, max, default: def });
const discrete = (values: number[], def: number): VideoDurationSpec => ({ mode: "discrete", values, default: def });

function seedance(resolutions: string[] | null, duration: VideoDurationSpec, materials: VideoMaterialLimits, durationByResolution?: VideoModelCapability["durationByResolution"]): VideoModelCapability {
    // 固定分辨率模型（resolutions 为 null）的档位仍是插件必填字段，负载固定带 720p。
    return { payload: "seedance", resolutions, fixedResolution: resolutions ? undefined : "720p", duration, materials, durationByResolution, aspectRatios: VIDEO_ASPECT_RATIOS };
}

/** 剥离渠道前缀（"ch1::model" → "model"）。 */
export function plainModelName(model: string) {
    return model.includes("::") ? model.slice(model.indexOf("::") + 2) : model;
}

export const videoModelCapabilities: Record<string, VideoModelCapability> = {
    // ── grok imagine ──
    "grok-imagine-video": {
        payload: "grok",
        resolutions: ["480p", "720p"],
        duration: range(1, 15, 6),
        materials: { images: 1, videos: 0, audios: 0 },
        singleImageMode: true,
        aspectRatios: VIDEO_ASPECT_RATIOS,
    },
    "grok-imagine-video-1.5": {
        payload: "grok",
        resolutions: ["480p", "720p", "1080p"],
        duration: range(1, 15, 6),
        materials: { images: 7, videos: 0, audios: 0 },
        referenceResolutionCap: "720p",
        aspectRatios: VIDEO_ASPECT_RATIOS,
    },

    // ── seedance / minimax（按秒计价档）──
    "seedance-2-pro": seedance(["480p", "720p", "1080p", "4k"], range(4, 15, 10), { images: 9, videos: 3, audios: 3 }),
    "seedance-2.5-pro": seedance(["480p", "720p", "1080p"], range(4, 30, 10), { images: 30, videos: 10, audios: 10 }),
    "seedance-2-fast": seedance(["480p", "720p"], discrete([5, 10], 10), { images: 9, videos: 3, audios: 3 }),
    "seedance-2-mini": seedance(["480p", "720p"], discrete([5, 10], 10), { images: 9, videos: 3, audios: 3 }),
    "minimax-h3-max": seedance(["480p", "768p"], range(5, 15, 10), { images: 12, videos: 12, audios: 12 }),
    "seedance2.0-d": seedance(["480p", "720p", "1080p"], range(4, 15, 10), { images: 9, videos: 3, audios: 3 }),
    "seedance2.0-e": seedance(["480p", "720p", "1080p", "4k"], range(4, 15, 10), { images: 9, videos: 3, audios: 3 }),
    "seedance2.0-f": seedance(["480p", "720p", "1080p"], range(4, 15, 10), { images: 9, videos: 3, audios: 3 }),

    // ── seedance / sd 固定分辨率档（档位在模型名，隐藏选择器）──
    "seedance2.0-a": seedance(null, range(4, 15, 10), { images: 9, videos: 0, audios: 0 }),
    "seedance2.0-b": seedance(null, range(4, 15, 10), { images: 9, videos: 3, audios: 3, total: 15 }),
    "seedance2.0-c": seedance(null, discrete([10, 15], 15), { images: 9, videos: 0, audios: 0 }),
    "seedance2.5-a": seedance(null, range(4, 30, 10), { images: 10, videos: 10, audios: 10, total: 30 }),
    "sd-2.0-a": seedance(null, discrete([5, 10, 15], 10), { images: 9, videos: 0, audios: 0 }),
    "sd-2.0-b": seedance(null, range(4, 15, 10), { images: 9, videos: 3, audios: 3 }),
    "sd-2.0-c": seedance(null, range(4, 15, 10), { images: 9, videos: 0, audios: 0 }),
    "sd-2.5-a": seedance(null, range(4, 30, 10), { images: 10, videos: 10, audios: 10, total: 30 }),
    "sd-2.5": seedance(null, discrete([30], 30), { images: 10, videos: 0, audios: 0 }),
    "sd-mini": seedance(
        ["480p", "720p"],
        range(4, 15, 10),
        { images: 9, videos: 0, audios: 3 },
        // sd-mini 的时长窗口跟分辨率走：480p 为 4-15（默认 10），720p 为 4-12（默认 5）。
        { "480p": { min: 4, max: 15, default: 10 }, "720p": { min: 4, max: 12, default: 5 } },
    ),

    // ── 站点经 sora 协议上线的固定分辨率档 ──
    "sd-2.0-480p": soraFixed({ images: 1, videos: 0, audios: 0 }),
    "sd-2.0-720p": soraFixed({ images: 1, videos: 0, audios: 0 }),
    "sd-2.0-1080p": soraFixed({ images: 1, videos: 0, audios: 0 }),
    "sd-2.0-4k": soraFixed({ images: 1, videos: 0, audios: 0 }),
    "sd-mini-480p": soraFixed({ images: 1, videos: 0, audios: 0 }),
    "sd-mini-720p": soraFixed({ images: 1, videos: 0, audios: 0 }),
    "minimax-h3-f": soraFixed({ images: 1, videos: 0, audios: 0 }),
};

function soraFixed(materials: VideoMaterialLimits): VideoModelCapability {
    return { payload: "sora", resolutions: null, duration: range(4, 15, 10), materials, aspectRatios: [] };
}

/** 解析模型能力；不在表内的模型返回 undefined，走通用（非门控）路径。 */
export function resolveVideoModelCapability(model: string): VideoModelCapability | undefined {
    return videoModelCapabilities[model.trim().toLowerCase()];
}

/**
 * 计算实际可用的分辨率选项。
 * 「隐藏选择器」只由静态表的 null（固定分辨率/档位在模型名的模型）决定，
 * 负载此时改用 fixedResolution；pricing 枚举存在时与静态表取交集
 * （pricing 的枚举是插件级而非模型级）；pricing 缺失或为空 schema 时回退静态表。
 */
export function effectiveResolutionOptions(capability: VideoModelCapability, pricingEnum: string[] | null | undefined): string[] | null {
    if (!capability.resolutions) return null;
    if (!Array.isArray(pricingEnum) || pricingEnum.length === 0) return capability.resolutions;
    const staticLower = capability.resolutions.map((item) => item.toLowerCase());
    const intersected = pricingEnum.filter((item) => staticLower.includes(item.toLowerCase()));
    return intersected.length > 0 ? intersected : capability.resolutions;
}

/** 当前分辨率下的时长规格（sd-mini 这类按分辨率区分窗口的模型）。 */
export function effectiveDurationSpec(capability: VideoModelCapability, resolution: string): VideoDurationSpec {
    const byResolution = resolution ? capability.durationByResolution?.[resolution.trim().toLowerCase()] : undefined;
    return byResolution ? { mode: "range", ...byResolution } : capability.duration;
}

/** 挂参考图后的分辨率上限（含则限制选项，不含则原样返回）。 */
export function applyReferenceResolutionCap(options: string[] | null, capability: VideoModelCapability, hasReferences: boolean): string[] | null {
    if (!options || !hasReferences || !capability.referenceResolutionCap) return options;
    const cap = parseResolutionNumber(capability.referenceResolutionCap);
    if (!cap) return options;
    return options.filter((item) => {
        const value = parseResolutionNumber(item);
        return value === null || value <= cap;
    });
}

export function parseResolutionNumber(value: string): number | null {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+)\s*p?$/i);
    if (match) return Number(match[1]);
    if (/^4k$/i.test(trimmed)) return 2160;
    return null;
}

/** 把画布内的 vquality（"720"/"480p"/…）规范成与枚举一致的档位值。 */
export function normalizeResolutionToEnum(value: string, options: string[] | null): string | null {
    if (!options || options.length === 0) return null;
    const numeric = parseResolutionNumber(value);
    if (numeric === null) return options.find((item) => item.toLowerCase() === value.trim().toLowerCase()) || null;
    const exact = options.find((item) => parseResolutionNumber(item) === numeric);
    if (exact) return exact;
    // 无精确档位时选择不超过当前值的最接近档位。
    const lower = options
        .map((item) => ({ item, value: parseResolutionNumber(item) }))
        .filter((entry): entry is { item: string; value: number } => entry.value !== null && entry.value <= numeric)
        .sort((a, b) => b.value - a.value);
    return lower[0]?.item || null;
}

/** 时长越界兜底：返回应使用的秒数。 */
export function clampSecondsToSpec(spec: VideoDurationSpec, seconds: number): number {
    if (spec.mode === "discrete") {
        if (spec.values.includes(seconds)) return seconds;
        return spec.default;
    }
    return Math.min(spec.max, Math.max(spec.min, Math.round(seconds)));
}
