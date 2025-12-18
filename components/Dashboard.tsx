"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { ConnectGithubBtn } from "@/components/github/ConnectGithubBtn"
import { RepoManager } from "@/components/RepoManager"
import { GitBranch, Zap, Code } from "lucide-react"

export function Dashboard() {
  const { data: session } = useSession()
  const isConnected = Boolean(session?.accessToken)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Header Section */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-center mb-20"
        >
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Code className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">CodeSync</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-6xl font-bold tracking-tight text-white"
          >
            Build with AI
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="mx-auto max-w-2xl text-lg text-neutral-400 leading-relaxed"
          >
            Connect your GitHub account, describe what you want to build, and watch as AI generates production-ready code. Deploy to your repository with a single click.
          </motion.p>
        </motion.section>

        {/* Steps Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 lg:grid-cols-2 mb-12"
        >
          <motion.section 
            variants={itemVariants}
            className="rounded-2xl border border-neutral-800/50 bg-neutral-900/30 p-8 backdrop-blur-sm hover:border-neutral-700/50 transition-colors"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <motion.div 
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20"
                  whileHover={{ scale: 1.05 }}
                >
                  <GitBranch className="h-6 w-6 text-blue-400" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Step 1
                  </p>
                  <p className="text-xl font-semibold mt-2 text-white">
                    {isConnected
                      ? "✓ GitHub Connected"
                      : "Connect GitHub"}
                  </p>
                  <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                    {isConnected
                      ? "Your GitHub account is connected with full repository permissions."
                      : "Authorize CodeSync to access your repositories securely using OAuth."}
                  </p>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <ConnectGithubBtn variant={isConnected ? "outline" : "default"} />
              </motion.div>
            </div>
          </motion.section>

          <motion.section 
            variants={itemVariants}
            className="rounded-2xl border border-neutral-800/50 bg-neutral-900/30 p-8 backdrop-blur-sm hover:border-neutral-700/50 transition-colors"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <motion.div 
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20"
                  whileHover={{ scale: 1.05 }}
                >
                  <Zap className="h-6 w-6 text-blue-400" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Step 2
                  </p>
                  <p className="text-xl font-semibold mt-2 text-white">
                    Select & Start Building
                  </p>
                  <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                    Choose a repository and start describing your project. The AI will understand and generate code.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>

        {/* Repositories Section */}
        {isConnected && (
          <motion.section 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-neutral-800/50 bg-neutral-900/30 p-8 backdrop-blur-sm"
          >
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Your Repositories</h2>
                <p className="text-sm text-neutral-400">
                  Select a repository and click &quot;Edit Project&quot; to open the AI workspace.
                </p>
              </div>
              <RepoManager />
            </div>
          </motion.section>
        )}

        {!isConnected && (
          <motion.section 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-dashed border-neutral-800/50 bg-neutral-900/20 p-12 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mb-4"
            >
              <Code className="h-8 w-8 text-neutral-600 mx-auto" />
            </motion.div>
            <p className="text-sm text-neutral-400">
              Connect your GitHub account to get started with CodeSync.
            </p>
          </motion.section>
        )}
      </div>
    </div>
  )
}
