type Props = { size?: number };

/** Legacy component name retained so existing routes keep their imports. */
export function NearBuyLogo({ size = 32 }: Props) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icibiz-mark.svg`}
      width={size}
      height={Math.round(size * 1.22)}
      alt="iciBiz"
      style={{ objectFit: "contain", flexShrink: 0 }}
    />
  );
}
