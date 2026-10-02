import Image from "next/image";
import logo from "../../public/logo.webp";

export function Logo({
  className = "h-8 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return <Image src={logo} alt="RouteX" sizes="160px" className={className} priority={priority} />;
}
