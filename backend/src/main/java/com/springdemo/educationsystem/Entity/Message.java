package com.springdemo.educationsystem.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    // Текст сообщения. Может быть пустым, если у сообщения есть вложение.
    @Column(columnDefinition = "TEXT")
    private String content;

    // Прикреплённый файл (опционально).
    @Column(name = "attachment_url", length = 512)
    private String attachmentUrl;

    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    @Column(name = "attachment_size")
    private Long attachmentSize;

    @Column(name = "is_read")
    private boolean isRead = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "conversation_id")
    private String conversationId;

    // НОВОЕ: Ссылка на сообщение, на которое отвечаем
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    // НОВОЕ: Реакции в формате JSON
    @ElementCollection
    @CollectionTable(name = "message_reactions",
            joinColumns = @JoinColumn(name = "message_id"))
    @MapKeyColumn(name = "user_id")
    @Column(name = "reaction")
    private Map<Long, String> reactions = new HashMap<>();

    public Message() {
        this.createdAt = LocalDateTime.now();
    }

    public Message(User sender, User receiver, String content) {
        this();
        this.sender = sender;
        this.receiver = receiver;
        this.content = content;
        this.conversationId = generateConversationId(sender.getId(), receiver.getId());
    }

    // Конструктор для ответа на сообщение
    public Message(User sender, User receiver, String content, Message replyTo) {
        this(sender, receiver, content);
        this.replyTo = replyTo;
    }

    private String generateConversationId(Long user1Id, Long user2Id) {
        return user1Id < user2Id ? user1Id + "_" + user2Id : user2Id + "_" + user1Id;
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public Message getReplyTo() { return replyTo; }
    public void setReplyTo(Message replyTo) { this.replyTo = replyTo; }
    public Map<Long, String> getReactions() { return reactions; }
    public void setReactions(Map<Long, String> reactions) { this.reactions = reactions; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }

    // Метод для добавления/изменения реакции
    public void addReaction(Long userId, String reaction) {
        this.reactions.put(userId, reaction);
    }

    // Метод для удаления реакции
    public void removeReaction(Long userId) {
        this.reactions.remove(userId);
    }
}
