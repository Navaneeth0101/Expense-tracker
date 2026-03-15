import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface MonthlySummary {
  month: string;
  year: number;
  total_spent: number;
  expense_count: number;
}

interface HighExpenseMonth {
  month: string;
  year: number;
  subscription_count: number;
  estimated_cost: number;
  subscription_names: string[];
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [highExpenseMonths, setHighExpenseMonths] = useState<HighExpenseMonth[]>([]);

  const fetchDashboardData = async () => {
    try {
      // Fetch monthly summary
      const summaryResponse = await fetch(`${BACKEND_URL}/api/expenses/monthly-summary`);
      const summaryData = await summaryResponse.json();
      setMonthlySummary(summaryData);

      // Fetch high expense months
      const highExpenseResponse = await fetch(`${BACKEND_URL}/api/subscriptions/high-expense-months`);
      const highExpenseData = await highExpenseResponse.json();
      setHighExpenseMonths(highExpenseData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Monthly Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar" size={24} color="#4CAF50" />
          <Text style={styles.cardTitle}>Current Month</Text>
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.monthLabel}>
            {monthlySummary?.month} {monthlySummary?.year}
          </Text>
          <Text style={styles.totalAmount}>₹{monthlySummary?.total_spent.toFixed(2) || '0.00'}</Text>
          <Text style={styles.expenseCount}>
            {monthlySummary?.expense_count || 0} expense{monthlySummary?.expense_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Ionicons name="wallet" size={32} color="#2196F3" />
          <Text style={styles.statValue}>₹{monthlySummary?.total_spent.toFixed(0) || '0'}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
          <Ionicons name="receipt" size={32} color="#9C27B0" />
          <Text style={styles.statValue}>{monthlySummary?.expense_count || 0}</Text>
          <Text style={styles.statLabel}>Expenses</Text>
        </View>
      </View>

      {/* High Expense Months Warning */}
      {highExpenseMonths.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning" size={24} color="#FF9800" />
            <Text style={styles.cardTitle}>High Expense Months</Text>
          </View>
          {highExpenseMonths.map((month, index) => (
            <View key={index} style={styles.warningItem}>
              <View style={styles.warningHeader}>
                <Text style={styles.warningMonth}>
                  {month.month} {month.year}
                </Text>
                <Text style={styles.warningAmount}>₹{month.estimated_cost.toFixed(2)}</Text>
              </View>
              <Text style={styles.warningText}>
                {month.subscription_count} subscription{month.subscription_count > 1 ? 's' : ''} renewing
              </Text>
              <Text style={styles.subscriptionNames}>
                {month.subscription_names.join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Welcome Message if no data */}
      {monthlySummary?.expense_count === 0 && highExpenseMonths.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="pie-chart" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Welcome to Expense Tracker!</Text>
          <Text style={styles.emptyText}>
            Start by adding your first expense or subscription to track your spending.
          </Text>
        </View>
      )}
    </ScrollView>
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
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    color: '#333',
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  monthLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  expenseCount: {
    fontSize: 14,
    color: '#999',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  warningItem: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningMonth: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  warningAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9800',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subscriptionNames: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
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
