import React, { useState, useEffect } from 'react'
import { Textarea } from './ui/textarea'
import { useChat } from 'ai/react';
import { Button } from './ui/button';
import { CornerDownLeft, Loader2, TextSearch, BookOpen, MessageCircle, Settings } from 'lucide-react';
import { Badge } from './ui/badge';
import Messages from './messages';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import Markdown from './markdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Props = {
  reportData?: string
}

interface RAGStatus {
  ready: boolean;
  message: string;
  details?: any;
}

const RAGChatComponent = ({ reportData }: Props) => {
  const [chatMode, setChatMode] = useState<'normal' | 'rag'>('rag');
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check RAG system status on component mount
  useEffect(() => {
    const checkRAGStatus = async () => {
      try {
        const response = await fetch('/api/rag-status');
        const data = await response.json();
        setRagStatus(data.ragSystem);
      } catch (error) {
        console.error('Error checking RAG status:', error);
        setRagStatus({
          ready: false,
          message: 'Could not check RAG system status'
        });
      } finally {
        setCheckingStatus(false);
      }
    };

    checkRAGStatus();
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, data } =
    useChat({
      api: chatMode === 'rag' ? "/api/ragchatgemini" : "/api/medichatgemini",
    });

  const getStatusBadge = () => {
    if (checkingStatus) {
      return <Badge variant="outline">Checking RAG Status...</Badge>;
    }
    
    if (chatMode === 'normal') {
      return <Badge variant="secondary">Standard Chat</Badge>;
    }
    
    return (
      <Badge variant={ragStatus?.ready ? "default" : "destructive"}>
        {ragStatus?.ready ? "🧠 RAG Enhanced" : "⚠️ RAG Unavailable"}
      </Badge>
    );
  };

  return (
    <div className="h-full bg-muted/50 relative flex flex-col min-h-[50vh] rounded-xl p-4 gap-4">
      {/* Status badges */}
      <div className="absolute right-3 top-1.5 flex gap-2">
        <Badge variant={'outline'}
          className={`${reportData && "bg-[#00B612]"}`}
        >
          {reportData ? "✓ Report Added" : "No Report Added"}
        </Badge>
        {getStatusBadge()}
      </div>

      {/* Chat mode selector */}
      <div className="mt-8 mb-2">
        <Select value={chatMode} onValueChange={(value: 'normal' | 'rag') => setChatMode(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select chat mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Standard Chat
              </div>
            </SelectItem>
            <SelectItem value="rag" disabled={!ragStatus?.ready}>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                RAG Enhanced Chat
                {!ragStatus?.ready && <span className="text-xs text-red-500">(Unavailable)</span>}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {/* RAG status info */}
        {chatMode === 'rag' && ragStatus && (
          <div className="mt-2 p-2 bg-muted rounded-md text-sm">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4" />
              <span className="font-medium">RAG System Status:</span>
            </div>
            <p className={ragStatus.ready ? "text-green-600" : "text-orange-600"}>
              {ragStatus.message}
            </p>
            {!ragStatus.ready && (
              <p className="text-xs text-muted-foreground mt-1">
                To enable RAG: Run <code>python setup_rag.py your_medical_book.pdf</code>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />
      <Messages messages={messages} isLoading={isLoading} />
      
      {/* Retrieved information accordion */}
      {(data?.length !== undefined && data.length > 0) && (
        <Accordion type="single" className="text-sm" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger dir="">
              <span className="flex flex-row items-center gap-2">
                <TextSearch /> 
                {chatMode === 'rag' ? 'Retrieved Medical Knowledge' : 'Relevant Info'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="whitespace-pre-wrap">
                <Markdown text={(data[data.length - 1] as any).retrievals as string} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      {/* Chat input form */}
      <form
        className="relative overflow-hidden rounded-lg border bg-background"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(event, {
            data: {
              reportData: reportData as string,
            },
          });
        }}
      >
        <Textarea
          value={input}
          onChange={handleInputChange}
          placeholder={
            chatMode === 'rag' 
              ? "Ask about medical conditions, treatments, or your report (using RAG knowledge base)..."
              : "Type your query here..."
          }
          className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {chatMode === 'rag' ? (
              <>
                <BookOpen className="h-3 w-3" />
                Using medical knowledge base
              </>
            ) : (
              <>
                <MessageCircle className="h-3 w-3" />
                Standard chat mode
              </>
            )}
          </div>
          <Button
            disabled={isLoading || (chatMode === 'rag' && !ragStatus?.ready)}
            type="submit"
            size="sm"
            className="ml-auto"
          >
            {isLoading ? "Analysing..." : "Ask"}
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CornerDownLeft className="size-3.5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default RAGChatComponent