import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, ArrowRight } from 'lucide-react';

export default function AskAiModal({ isOpen, onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Good morning Dana! I am your i2C Financial Advisor. I monitor your QuickBooks AR/AP and Brightpearl inventory in real time. How can I help you today?'
    }
  ]);

  if (!isOpen) return null;

  const quickPrompts = [
    "Why did Northgate's risk score jump?",
    "Show 3 early payment discounts closing soon",
    "How can I free up $50k cash this month?",
    "Which SKUs are overstocked in Brightpearl?"
  ];

  const handleSend = (queryText) => {
    const textToUse = queryText || input;
    if (!textToUse.trim()) return;

    const userMsg = { sender: 'user', text: textToUse };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Generate intelligent AI reply based on dashboard context
    setTimeout(() => {
      let aiResponse = "I've analyzed your financial data across QuickBooks and Brightpearl. ";
      const lower = textToUse.toLowerCase();

      if (lower.includes('northgate')) {
        aiResponse = "Northgate Supply ($18,000 overdue) stretched from 34 to 52 days to pay, driving their PayScore down to 42. I recommend issuing a 30% down payment term for their next $90,000 order.";
      } else if (lower.includes('discount') || lower.includes('discount')) {
        aiResponse = "You have 3 vendor early-payment discounts worth $3,653 closing within 7 days. Apex Resins offers a 2% discount ($850) if paid by Aug 12. Your current cash balance of $1.28M easily supports taking this.";
      } else if (lower.includes('cash') || lower.includes('free up')) {
        aiResponse = "To free up cash immediately: 1) Demand return of $6,400 unused stock from Anchor Distributors, 2) Liquidate $229K of dead stock frozen >90 days, 3) Capture $3,653 in early payment discounts.";
      } else if (lower.includes('sku') || lower.includes('inventory') || lower.includes('overstock')) {
        aiResponse = "You currently have $438K (21% of inventory value) in overstocked SKUs — primarily PVC Pipe 2\" Schedule 40 and THHN Wire. 2 SKUs have over 12 months of cover.";
      } else {
        aiResponse = `Regarding "${textToUse}": Your current cash position is solid at $1,284,900 (+3.2% vs last month). Total AR is $340,000 with $29K at risk across 3 accounts. Gross margin is 23.8% against your target of 26.0%.`;
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: aiResponse }]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="flex h-full w-full max-w-lg flex-col bg-card border-l border-border shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-[#701a75] p-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md">
              <Sparkles className="size-4 text-[#f472b6]" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-none">Ask i2C Advisor</h3>
              <p className="text-[11px] text-white/80 mt-0.5">Cross-Domain Intelligence Assistant</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#701a75] text-white">
                  <Bot className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#0d9488] text-white rounded-br-none font-medium'
                    : 'bg-surface text-foreground rounded-bl-none ring-1 ring-border shadow-xs'
                }`}
              >
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#bef264] text-[#112723] font-bold text-xs">
                  DM
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 border-t border-border/50 bg-surface/50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Suggested Questions</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground hover:bg-[#0d9488] hover:text-white transition-colors cursor-pointer text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about cash flow, margins, or AR risk..."
              className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#0d9488] focus:outline-none"
            />
            <button
              type="submit"
              className="flex size-9 items-center justify-center rounded-full bg-[#701a75] text-white hover:bg-[#86198f] transition-colors cursor-pointer"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
