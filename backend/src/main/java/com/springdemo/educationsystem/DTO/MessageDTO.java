package com.springdemo.educationsystem.DTO;

import java.time.LocalDateTime;
import java.util.Map;

public class MessageDTO {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private Long receiverId;
    private String receiverName;
    private String content;
    private boolean isRead;
    private LocalDateTime createdAt;
    private String conversationId;

    // НОВОЕ: Информация о сообщении, на которое отвечаем
    private ReplyMessageDTO replyTo;

    // НОВОЕ: Реакции
    private Map<Long, String> reactions;

    // НОВОЕ: Прикреплённый файл (опционально)
    private String attachmentUrl;
    private String attachmentName;
    private Long attachmentSize;

    public MessageDTO() {}

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getSenderAvatar() { return senderAvatar; }
    public void setSenderAvatar(String senderAvatar) { this.senderAvatar = senderAvatar; }
    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public ReplyMessageDTO getReplyTo() { return replyTo; }
    public void setReplyTo(ReplyMessageDTO replyTo) { this.replyTo = replyTo; }
    public Map<Long, String> getReactions() { return reactions; }
    public void setReactions(Map<Long, String> reactions) { this.reactions = reactions; }
}
