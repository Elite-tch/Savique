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
                description: "Before paying bills or spending, immediately move savings into a separate account or vault. Treat savings as a non-negotiable expense.",
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
                description: "Set up automatic transfers to your Savique vault right after payday. Remove the decision-making process entirely.",
            },
            {
                title: "Visualize Your Goal",
                description: "Name your vaults after specific goals (e.g., 'Emergency Fund', 'Laptop', 'Vacation'). Concrete targets are easier to commit to than abstract 'savings'.",
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
        <div className="space-y-12 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <Lightbulb className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Financial Education</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">Savings Tips</h1>
                <p className="text-gray-400 text-lg max-w-2xl">
                    Practical strategies to build discipline, increase income, and make the most of your Savique vaults.
                </p>
            </div>

            {/* Tips Sections */}
            {TIPS.map((section, idx) => (
                <section key={idx} className="space-y-6">
                    <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                        
                        <h2 className="text-2xl font-bold">{section.category}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {section.tips.map((tip, i) => (
                            <Card key={i} className="p-6 bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-all">
                                <h3 className="font-bold text-lg mb-3">{tip.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    {tip.description}
                                </p>
                            </Card>
                        ))}
                    </div>
                     <div className="absolute top-0 right-0 -mt-20 w-96 h-96 bg-primary/20 blur-[120px] fixed rounded-full pointer-events-none" />
                                    <div className="absolute top-52 right-10 hidden md:block fixed  opacity-20 pointer-events-none">
                                        <Lightbulb size={240} className="text-white" />
                                    </div>
                                
                </section>
            ))}
 
            {/* Flare Ecosystem Opportunities */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  
                    <h2 className="text-2xl font-bold">Earn on Flare</h2>
                </div>
                <p className="text-gray-400 text-sm">
                    These are legitimate ways to earn additional income within the Flare ecosystem. Earnings can be deposited directly into your Savique vaults.
                </p>

                <div className="space-y-4">
                    {FLARE_OPPORTUNITIES.map((opp, i) => (
                        <Card key={i} className="p-6 bg-white/[0.02] border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-purple-400">
                                    {opp.icon}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold">{opp.title}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-gray-500 uppercase">
                                            {opp.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm">{opp.description}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full md:w-auto border-white/10 bg-white/5 hover:bg-white/10 gap-2"
                                onClick={() => window.open(opp.link, '_blank')}
                            >
                                Learn More <ExternalLink size={14} />
                            </Button>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Footer Note */}
            <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-4">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold mb-2">Remember: Time in the Market &gt; Timing the Market</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Savique's penalty mechanism exists to protect you from impulsive decisions. The longer you stay disciplined, the more your future self will thank you. Start small, stay consistent, and let compound discipline work its magic.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
