import { Suspense } from "react";

import { InviteView } from "@/features/public/public-views";

async function WithParams({ params }: Pick<PageProps<"/invite/[token]">, "params">) {
  const { token } = await params;
  return <InviteView token={decodeURIComponent(token)} />;
}

export default function Page({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense>
      <WithParams params={params} />
    </Suspense>
  );
}
