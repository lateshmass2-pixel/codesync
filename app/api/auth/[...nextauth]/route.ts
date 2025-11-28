// src/app/api/auth/[...nextauth]/route.ts

import { handlers } from "@/auth" // Make sure this path points to your auth.ts file

export const { GET, POST } = handlers