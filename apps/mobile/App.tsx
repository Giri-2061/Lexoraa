import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

const DEV_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
const FALLBACK_PROD_URL = 'https://example.com';

function getInitialUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;
  const configUrl = Constants.expoConfig?.extra?.webAppUrl as string | undefined;
  const resolvedUrl = envUrl || configUrl;
  if (__DEV__) {
    return resolvedUrl || DEV_URL;
  }

  return resolvedUrl || FALLBACK_PROD_URL;
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const appUrl = useMemo(() => getInitialUrl(), []);

  const onNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setHasError(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  const onShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const { url } = request;
    const isHttp = url.startsWith('http://') || url.startsWith('https://');

    if (!isHttp) {
      Linking.openURL(url).catch(() => undefined);
      return false;
    }

    return true;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loaderText}>Loading Lexora...</Text>
        </View>
      ) : null}

      {hasError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Unable to load app</Text>
          <Text style={styles.errorText}>Check your internet connection or app URL.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setHasError(false);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <WebView
        ref={webViewRef}
        source={{ uri: appUrl }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
        onNavigationStateChange={onNavigationStateChange}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        pullToRefreshEnabled
        renderLoading={() => null}
        startInLoadingState
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loader: {
    position: 'absolute',
    zIndex: 2,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,250,252,0.95)',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  errorBox: {
    position: 'absolute',
    zIndex: 3,
    top: '35%',
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 16,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f766e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
