import { Suspense } from "react";

import { VerifyResult } from "@/features/public/public-views";

async function WithParams({ params }: Pick<PageProps<"/verify/[code]">, "params">) {
  const { code } = await params;
  return <VerifyResult code={decodeURIComponent(code)} />;
}

export default function Page({ params }: PageProps<"/verify/[code]">) {
  return (
    <Suspense>
      <WithParams params={params} />
    </Suspense>
  );
}
