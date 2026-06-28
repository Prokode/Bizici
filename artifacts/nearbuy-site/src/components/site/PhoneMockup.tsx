import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Search, Star, ArrowLeft, Plus } from "lucide-react";
import { NearBuyLogo } from "@/components/NearBuyLogo";

const NAVY = "#1B2A5C";
const ORANGE = "#F58220";
const GREEN = "#7FB927";

/** Realistic phone shell. Pass any screen as children. */
export function PhoneMockup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"relative mx-auto w-[270px] " + (className ?? "")}>
      <div
        className="relative rounded-[2.6rem] p-[10px] shadow-2xl"
        style={{ backgroundColor: NAVY }}
      >
        <div
          className="absolute left-1/2 top-[10px] z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl"
          style={{ backgroundColor: NAVY }}
        />
        <div className="relative h-[560px] w-full overflow-hidden rounded-[2rem] bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

function MapPin({
  top,
  left,
  size = 30,
  delay = 0,
}: {
  top: string;
  left: string;
  size?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute drop-shadow-md"
      style={{ top, left }}
      animate={reduce ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <NearBuyLogo size={size} />
    </motion.div>
  );
}

/** Map-discovery screen used in the hero. */
export function MapScreen() {
  const { t } = useTranslation();
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg,#EAF4E2 0%,#F3F7FB 45%,#FDEFE3 100%)",
        }}
      />
      {/* faux street grid */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(#cdd7e6 1px,transparent 1px),linear-gradient(90deg,#cdd7e6 1px,transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />
      {/* a softer diagonal "main road" */}
      <div
        className="absolute -left-10 top-1/3 h-10 w-[140%] -rotate-12 opacity-70"
        style={{ backgroundColor: "#ffffff" }}
      />

      {/* search bar */}
      <div className="absolute left-3 right-3 top-4 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-md backdrop-blur">
        <Search size={15} color={NAVY} />
        <span className="text-[11px] font-medium text-neutral-500">
          {t("mock.searchPlaceholder")}
        </span>
      </div>

      <MapPin top="26%" left="22%" size={34} delay={0} />
      <MapPin top="40%" left="60%" size={26} delay={0.4} />
      <MapPin top="55%" left="32%" size={28} delay={0.8} />

      {/* "you are here" dot */}
      <div className="absolute left-1/2 top-[48%] -translate-x-1/2">
        <span className="relative flex h-4 w-4">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: ORANGE }}
          />
          <span
            className="relative inline-flex h-4 w-4 rounded-full border-2 border-white"
            style={{ backgroundColor: ORANGE }}
          />
        </span>
      </div>

      {/* bottom shop card */}
      <div className="absolute bottom-4 left-3 right-3 rounded-2xl bg-white p-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#FDEFE3" }}
          >
            <NearBuyLogo size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-bold"
              style={{ color: NAVY }}
            >
              {t("mock.shopName")}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              <Star size={11} fill={ORANGE} color={ORANGE} />
              <span className="text-[11px] font-semibold text-neutral-600">
                4.9
              </span>
              <span className="text-[11px] text-neutral-400">
                · {t("mock.distance")}
              </span>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ backgroundColor: ORANGE }}
          >
            {t("mock.open")}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: "#EAF4E2", color: "#4d7a14" }}
          >
            ● {t("mock.inStock")}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Direct-chat screen used in the feature showcase. */
export function ChatScreen() {
  const { t } = useTranslation();
  return (
    <div className="relative flex h-full w-full flex-col bg-[#F7F9FC]">
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 pb-3 pt-5"
        style={{ backgroundColor: NAVY }}
      >
        <ArrowLeft size={18} color="#fff" />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
          <NearBuyLogo size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{t("mock.shopName")}</p>
          <p className="flex items-center gap-1 text-[10px] text-white/70">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: GREEN }}
            />
            {t("mock.online")}
          </p>
        </div>
      </div>

      {/* bubbles */}
      <div className="flex flex-1 flex-col gap-2.5 px-3 py-4">
        <div className="max-w-[78%] self-end rounded-2xl rounded-br-md px-3 py-2 text-[12px] font-medium text-white shadow-sm"
          style={{ backgroundColor: ORANGE }}
        >
          {t("mock.msgOut")}
        </div>
        <div className="max-w-[80%] self-start rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[12px] font-medium text-neutral-700 shadow-sm">
          {t("mock.msgIn")}
        </div>
        <div className="max-w-[60%] self-start rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm">
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-300 [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-300 [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-300" />
          </span>
        </div>
      </div>

      {/* input */}
      <div className="flex items-center gap-2 px-3 pb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
          <Plus size={16} color={NAVY} />
        </div>
        <div className="flex-1 rounded-full bg-white px-4 py-2.5 text-[11px] text-neutral-400 shadow-sm">
          {t("mock.typeMessage")}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: GREEN }}
        >
          <Search size={15} color="#fff" />
        </div>
      </div>
    </div>
  );
}
