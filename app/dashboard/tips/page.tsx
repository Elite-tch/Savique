"use client";

import { Card } from "@/components/ui/card";
import {
    Lightbulb,
    BookOpen,
    DollarSign,
    TrendingUp,
    Shield,
    Wallet,
    Target,
    Clock,
    Zap,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const TIPS = [
    {
        category: "Budgeting Basics",

        color: "text-blue-500",
        tips: [
            {
                title: "The 50/30/20 Rule",
                description: "Allocate 50% of your income to needs, 30% to wants, and 20% to savings. Use Savique to automatically lock that 20% the moment you receive funds.",
            },
            {
                title: "Track Every Dollar",
                description: "Awareness is the first step. Use a simple spreadsheet or app to categorize your spending for 30 days. You'll be surprised where money disappears.",
            },
            {
                title: "Pay Yourself First",
                description: "Before paying bills or spending, immediately move savings into a separate account or Savings. Treat savings as a non-negotiable expense.",
            }
        ]
    },
    {
        category: "Building Discipline",

        color: "text-emerald-500",
        tips: [
            {
                title: "Start Small, Stay Consistent",
                description: "Saving $5 daily ($150/month) is more powerful than sporadic $100 deposits. Consistency builds the habit, not the amount.",
            },
            {
                title: "Automate Everything",
                description: "Set up automatic transfers to your Savique Savings right after payday. Remove the decision-making process entirely.",
            },
            {
                title: "Visualize Your Goal",
                description: "Name your Savings after specific goals (e.g., 'Emergency Fund', 'Laptop', 'Vacation'). Concrete targets are easier to commit to than abstract 'savings'.",
            }
        ]
    },
    {
        category: "Earning More",

        color: "text-orange-500",
        tips: [
            {
                title: "Side Income Streams",
                description: "Freelancing, gig work, or selling unused items can add $200-500/month. Dedicate 100% of side income to savings for rapid growth.",
            },
            {
                title: "Negotiate Your Salary",
                description: "A single 5% raise can add thousands annually. Research market rates and ask confidently. The worst answer is 'no'.",
            },
            {
                title: "Invest in Skills",
                description: "Courses, certifications, or learning new tools can increase your earning potential by 20-50% within a year.",
            }
        ]
    }
];

const FLARE_OPPORTUNITIES = [
    {
        title: "FTSO Delegation",
        description: "Delegate your FLR tokens to Flare Time Series Oracle providers to earn 7-10% APR. No lockup required.",
        link: "https://portal.flare.network/",
        difficulty: "Beginner",
        icon: <Zap className="w-4 h-4" />
    },
    {
        title: "Liquidity Provision",
        description: "Provide liquidity to Flare DEXes (Enosys, SparkDEX) to earn trading fees. Best for users with $500+ capital.",
        link: "https://enosys.global/",
        difficulty: "Intermediate",
        icon: <DollarSign className="w-4 h-4" />
    },
    {
        title: "Testnet Participation",
        description: "Test new Flare protocols on Coston2. Early testers often receive airdrops or governance tokens.",
        link: "https://flare.network/ecosystem/",
        difficulty: "Beginner",
        icon: <Wallet className="w-4 h-4" />
    }
];

export default function SavingsTipsPage() {
    return (
        <div className="space-y-16 max-w-5xl mx-auto pb-20 relative">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mt-20 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
            >
                <div className="flex items-center gap-2 text-primary">
                    <Lightbulb className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Financial Education</span>
                </div>
                <h1 className="text-5xl font-bold tracking-tight text-white leading-tight">Savings Tips & <br /><span className="text-primary glow">Financial Discipline</span></h1>
                <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                    Practical strategies to build discipline, increase income, and make the most of your Savique Savings.
                </p>
            </motion.div>

            {/* Tips Sections */}
            <div className="space-y-24">
                {TIPS.map((section, idx) => (
                    <motion.section
                        key={idx}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, delay: idx * 0.1 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center gap-6">
                            <h2 className="text-3xl font-bold text-white whitespace-nowrap">{section.category}</h2>
                            <div className="h-[1px] w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {section.tips.map((tip, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{
                                        y: -5,
                                        backgroundColor: "rgba(230, 32, 88, 0.05)",
                                        borderColor: "rgba(230, 32, 88, 0.3)",
                                        boxShadow: "0 15px 30px -10px rgba(230, 32, 88, 0.15)"
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group cursor-default transition-colors duration-500"
                                >
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <h3 className="font-bold text-xl mb-4 text-white group-hover:text-primary transition-colors duration-300">{tip.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                                        {tip.description}
                                    </p>

                                    {/* Subtle decorative glow on hover */}
                                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                ))}
            </div>

            {/* Flare Ecosystem Opportunities */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-10 pt-10"
            >
                <div className="flex items-center gap-6">
                    <h2 className="text-3xl font-bold text-white whitespace-nowrap text-primary glow">Earn on Flare</h2>
                    <div className="h-[1px] w-full bg-gradient-to-r from-white/10 via-primary/5 to-transparent" />
                </div>
                <p className="text-gray-400 text-lg leading-relaxed">
                    Legitimate ways to earn additional income within the Flare ecosystem. These earnings can be locked directly into your Savings for compounding growth.
                </p>

                <div className="grid gap-6">
                    {FLARE_OPPORTUNITIES.map((opp, i) => (
                        <motion.div
                            key={i}
                            whileHover={{
                                scale: 1.01,
                                backgroundColor: "rgba(230, 32, 88, 0.03)",
                                borderColor: "rgba(230, 32, 88, 0.2)"
                            }}
                            className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group transition-all duration-300 shadow-xl"
                        >
                            <div className="flex items-start gap-8 flex-1">
                                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0 text-primary border border-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    {opp.icon}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-bold text-2xl text-white group-hover:text-primary transition-colors duration-300">{opp.title}</h3>
                                        <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest border border-white/5 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                                            {opp.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-lg leading-relaxed group-hover:text-gray-300 transition-colors">{opp.description}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full md:w-auto border-white/10 bg-white/5 hover:bg-primary hover:text-white hover:border-primary rounded-2xl h-14 px-10 text-base font-bold gap-3 transition-all duration-300 shadow-lg shadow-black/20"
                                onClick={() => window.open(opp.link, '_blank')}
                            >
                                Learn More <ExternalLink size={18} />
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            {/* Footer Note */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="p-12 rounded-[3rem] bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-primary/20 relative overflow-hidden mt-10"
            >
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -mr-40 -mt-40" />
                <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Clock className="w-8 h-8 text-primary shadow-glow" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white tracking-tight">Time in the Market &gt; Timing the Market</h3>
                        <p className="text-gray-400 leading-relaxed text-lg max-w-4xl">
                            Savique's penalty mechanism exists to protect you from impulsive decisions. The longer you stay disciplined, the more your future self will thank you. Start small, stay consistent, and let compound discipline work its magic.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
