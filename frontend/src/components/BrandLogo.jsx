import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";

export const BrandLogo = ({ url, className = "h-9 w-9", iconClass = "h-5 w-5", testid }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  if (url && !failed) {
    return <img data-testid={testid} src={url} alt="Logo usaha" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-xl bg-card object-contain`} />;
  }
  return (
    <span data-testid={testid} className={`${className} grid shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground`}>
      <Coffee className={iconClass} />
    </span>
  );
};
