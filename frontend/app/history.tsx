import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  created_at: string;
}

const CATEGORY_ICONS: { [key: string]: string } = {
  Food: 'fast-food',
  Transport: 'car',
  Shopping: 'cart',
  Bills: 'receipt',
  Subscriptions: 'repeat',
  Other: 'ellipsis-horizontal',
};

const CATEGORY_COLORS: { [key: string]: string } = {
  Food: '#FF5722',
  Transport: '#2196F3',
  Shopping: '#9C27B0',
  Bills: '#FF9800',
  Subscriptions: '#4CAF50',
  Other: '#607D8B',
};

export default function History() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/expenses`);
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this ₹${expense.amount} expense?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/expenses/${expense.id}`, {
                method: 'DELETE',
              });
              fetchExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense.');
            }
          },
        },
      ]
    );
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const categoryColor = CATEGORY_COLORS[item.category] || '#607D8B';
    const categoryIcon = CATEGORY_ICONS[item.category] || 'ellipsis-horizontal';
    
    let expenseDate;
    try {
      expenseDate = parseISO(item.date);
    } catch {
      expenseDate = new Date();
    }

    return (
      <View style={styles.expenseItem}>
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
        </View>
        <View style={styles.expenseDetails}>
          <View style={styles.expenseHeader}>
            <Text style={styles.categoryText}>{item.category}</Text>
            <Text style={styles.amountText}>₹{item.amount.toFixed(2)}</Text>
          </View>
          <Text style={styles.dateText}>{format(expenseDate, 'MMM d, yyyy')}</Text>
          {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Expenses Yet</Text>
          <Text style={styles.emptyText}>
            Start tracking your expenses by adding your first entry.
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  noteText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
