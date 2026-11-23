import { Suspense } from "react";

import { ResetPasswordView } from "@/features/public/public-views";

async function WithParams({ params }: Pick<PageProps<"/reset-password/[token]">, "params">) {
  const { token } = await params;
  return <ResetPasswordView token={decodeURIComponent(token)} />;
}

export default function Page({ params }: PageProps<"/reset-password/[token]">) {
  return (
    <Suspense>
      <WithParams params={params} />
    </Suspense>
  );
}
