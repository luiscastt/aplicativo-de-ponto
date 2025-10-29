import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, User, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showSuccess, showError } from '@/utils/toast';
import type { Profile } from '@/types';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
  profiles?: { first_name: string | null; email: string | null };
}

interface ChatUser {
  id: string;
  name: string;
  role: string;
}

const fetchUsersForChat = async (currentUserId: string): Promise<ChatUser[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, email, role')
    .neq('id', currentUserId) // Excluir o próprio usuário
    .order('first_name', { ascending: true });

  if (error) throw error;
  
  return data.map(p => ({
    id: p.id,
    name: p.first_name || p.email || 'Usuário Desconhecido',
    role: p.role,
  }));
};

const fetchMessages = async (senderId: string, recipientId: string): Promise<Message[]> => {
  if (!recipientId) return []; // Não carrega mensagens se não houver destinatário selecionado

  // Filtra mensagens entre os dois usuários (sender <-> recipient)
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, sender_id, recipient_id, content, created_at,
      profiles(first_name, email)
    `) // Explicitly selecting columns
    .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  return data as unknown as Message[];
};

const sendMessage = async (content: string, recipientId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  const senderId = user?.id;
  if (!senderId) throw new Error("Usuário não autenticado.");

  const { error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, content });
  
  if (error) throw error;
};

const Chat = () => {
  const { user } = useAuth() as { user: Profile | null };
  const queryClient = useQueryClient();
  const [selectedRecipient, setSelectedRecipient] = useState<ChatUser | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id || '';
  
  // Fetch lista de usuários para chat privado
  const { data: chatUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["chatUsers"],
    queryFn: () => fetchUsersForChat(currentUserId),
    enabled: !!user,
  });

  // Define o primeiro usuário como destinatário padrão se nenhum estiver selecionado
  useEffect(() => {
    if (!selectedRecipient && chatUsers && chatUsers.length > 0) {
      setSelectedRecipient(chatUsers[0]);
    }
  }, [chatUsers, selectedRecipient]);

  // Fetch mensagens do chat selecionado
  const { data: messages, isLoading: messagesLoading, refetch } = useQuery({
    queryKey: ["messages", selectedRecipient?.id],
    queryFn: () => fetchMessages(currentUserId, selectedRecipient?.id || ''),
    enabled: !!user && !!selectedRecipient,
  });

  // Subscription para mensagens em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const newMessage = payload.new as Message;
        
        // Invalida a query APENAS se a mensagem for para o chat atual (privado)
        const isRelevant = (
          (newMessage.sender_id === currentUserId && newMessage.recipient_id === selectedRecipient?.id) ||
          (newMessage.sender_id === selectedRecipient?.id && newMessage.recipient_id === currentUserId)
        );

        if (isRelevant) {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedRecipient?.id] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedRecipient?.id, currentUserId, queryClient]);
  
  // Scroll para o final das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage(content, selectedRecipient!.id),
    onSuccess: () => {
      setMessageContent('');
      // A subscription deve cuidar do refetch, mas forçamos para garantir
      refetch(); 
    },
    onError: (error: any) => showError(`Erro ao enviar mensagem: ${error.message}`),
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim() && selectedRecipient && !sendMutation.isPending) {
      sendMutation.mutate(messageContent.trim());
    }
  };

  const recipientName = selectedRecipient ? selectedRecipient.name : 'Selecione um Contato';

  return (
    <div className="w-full flex flex-col md:flex-row h-[calc(100vh-100px)]">
      
      {/* Título */}
      <div className="mb-6 md:hidden">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Chat Interno</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Comunicação direta entre colaboradores e gestores.
        </p>
      </div>

      {/* Sidebar de Usuários */}
      <Card className="w-full md:w-64 flex-shrink-0 mb-4 md:mb-0 md:mr-4">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-lg text-card-foreground flex items-center">
            <User className="h-4 w-4 mr-2" /> Contatos
          </CardTitle>
        </CardHeader>
        <ScrollArea className="h-full max-h-[300px] md:max-h-[calc(100vh-160px)]">
          <div className="p-2 space-y-1">
            {usersLoading ? (
              <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
            ) : (
              chatUsers?.map(u => (
                <Button
                  key={u.id}
                  variant={selectedRecipient?.id === u.id ? "default" : "ghost"}
                  className="w-full justify-start truncate"
                  onClick={() => setSelectedRecipient(u)}
                >
                  <User className="h-4 w-4 mr-2" /> {u.name}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Área de Chat */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-xl text-card-foreground">{recipientName}</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {!selectedRecipient ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                <MessageCircle className="h-6 w-6 mr-2" /> Selecione um contato para iniciar a conversa.
              </div>
            ) : messagesLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {messages?.map((msg) => {
                  const isSender = msg.sender_id === currentUserId;
                  const senderName = isSender ? 'Você' : (msg.profiles?.first_name || msg.profiles?.email || 'Desconhecido');
                  
                  return (
                    <div key={msg.id} className={cn("flex", isSender ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[70%] p-3 rounded-lg shadow-md",
                        isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-muted-foreground rounded-tl-none"
                      )}>
                        <p className="font-semibold text-xs mb-1">{senderName}</p>
                        <p className="text-sm">{msg.content}</p>
                        <span className={cn("block text-xs mt-1", isSender ? "text-primary-foreground/80" : "text-muted-foreground/80")}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
            <Input
              placeholder={selectedRecipient ? "Digite sua mensagem..." : "Selecione um contato primeiro"}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              disabled={sendMutation.isPending || !selectedRecipient}
            />
            <Button type="submit" size="icon" disabled={sendMutation.isPending || !selectedRecipient}>
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Chat;