const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/messages/contacts
// For students: Returns their assigned teacher
// For teachers: Returns their assigned students
router.get('/contacts', async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('teacherId', 'name email role').populate('studentIds', 'name email role grade');
    if (!user) return res.status(404).json({ error: 'User not found' });

    let contacts = [];
    if (user.role === 'student' && user.teacherId) {
      contacts = [user.teacherId];
    } else if (user.role === 'teacher') {
      contacts = user.studentIds || [];
    }

    // Get unread message counts for each contact
    const contactsWithUnread = await Promise.all(contacts.map(async (contact) => {
      const unreadCount = await Message.countDocuments({
        senderId: contact._id,
        receiverId: user._id,
        isRead: false
      });
      return { ...contact.toObject(), unreadCount };
    }));

    res.json(contactsWithUnread);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/messages/thread/:contactId
router.get('/thread/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const currentUserId = req.userId;

    // Mark messages as read
    await Message.updateMany(
      { senderId: contactId, receiverId: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: contactId },
        { senderId: contactId, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Error fetching thread:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages
router.post('/', async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    const message = new Message({
      senderId: req.userId,
      receiverId,
      content
    });

    await message.save();
    res.json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only allow sender to delete their own message
    if (message.senderId.toString() !== req.userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// DELETE /api/messages/thread/:contactId - Clear entire conversation
router.delete('/thread/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const currentUserId = req.userId;

    await Message.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: contactId },
        { senderId: contactId, receiverId: currentUserId }
      ]
    });

    res.json({ success: true, message: 'Conversation cleared' });
  } catch (err) {
    console.error('Error clearing thread:', err);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

module.exports = router;
