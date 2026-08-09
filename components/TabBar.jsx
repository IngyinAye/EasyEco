import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Bot from '../assets/Bot.svg';
import Graph from '../assets/Graph.svg';
import Home from '../assets/Home.svg';
import Point from '../assets/notifications.svg';
import User from '../assets/User.svg';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLOATING_PADDING = 25;
const BAR_WIDTH = SCREEN_WIDTH - (FLOATING_PADDING * 2);

// ==========================================================
// SVG Icons & Background
// ==========================================================
const TabBgSvg = ({ width, height, colors }) => {
  const center = width / 2;
  const notchRadius = 26;   // medium notch
  const curveDepth = 26;    // medium curve
  const d = `M 0 0 
    L ${center - notchRadius} 0 
    C ${center - notchRadius + 10} 0 ${center - notchRadius + 10} ${curveDepth} ,${center} ${curveDepth} 
    C ${center + notchRadius - 10} ${curveDepth} ${center + notchRadius - 10} 0 ,${center + notchRadius} 0 
    L ${width} 0 
    L ${width} ${height} 
    L 0 ${height} Z
  `;

  return (
    <Svg 
      width={BAR_WIDTH} 
      height={height} 
      viewBox={`0 0 ${BAR_WIDTH} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <Path d={d} fill={colors.card} />
    </Svg>
  );
};

export const RobotIcon = ({ size, color }) => <Bot width={size} height={size} stroke={color}/>;
export const HomeIcon = ({ color, size }) => <Home width={size} height={size} stroke={color}/>;
export const ChartIcon = ({ color, size }) => <Graph width={size} height={size} stroke={color}/>;
export const DollarIcon = ({ color, size }) => <Point width={size} height={size} stroke={color}/>;
export const UserIcon = ({ color, size }) => <User width={size} height={size} stroke={color}/>;


export function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  
  const currentRoute = state?.routes?.[state?.index]?.name;
  if (currentRoute === 'robot') {
    return null;
  }

  const colors = { 
    primary: '#1d4ed8', 
    inactive: '#1d4ed8', 
    card: '#ededed', 
    accent: '#1e40af' 
  };
  
  const routes = state?.routes || [
    { key: 'index', name: 'index' }, 
    { key: 'analytics', name: 'analytics' }, 
    { key: 'robot', name: 'robot' }, 
    { key: 'finance', name: 'finance' }, 
    { key: 'profile', name: 'profile' }
  ];
  
  const activeIndex = state?.index ?? 0;
  const barHeight = Platform.OS === 'ios' ? 62 : 54;  // medium bar
  const robotIndex = routes.findIndex(r => r.name.toLowerCase() === 'robot');

  const bottomOffset = insets.bottom > 0 
    ? insets.bottom 
    : FLOATING_PADDING;

  return (
    <View style={[styles.outerContainer, { bottom: bottomOffset }]}>
      <View style={[styles.innerBarContainer, { height: barHeight }]}>
        <TabBgSvg width={BAR_WIDTH} height={barHeight} colors={colors} />
        <View style={[styles.itemsContainer, { height: barHeight }]}>
          {routes.map((route, index) => {
            if (index === robotIndex) return <View key="spacer" style={styles.spacerItem} />;
            
            const isFocused = activeIndex === index;
            const renderIcon = () => {
              const name = route.name.toLowerCase();
              if (name === 'index') return <HomeIcon color={isFocused ? colors.accent : colors.inactive} size={24} />;
              if (name === 'analytics') return <ChartIcon color={isFocused ? colors.accent : colors.inactive} size={24} />;
              if (name === 'finance') return <DollarIcon color={isFocused ? colors.accent : colors.inactive} size={28} />;
              return <UserIcon color={isFocused ? colors.accent : colors.inactive} size={24} />;
            };
            
            return (
              <TouchableOpacity 
                key={route.key} 
                onPress={() => navigation?.navigate(route.name)} 
                style={styles.tabItem}
              >
                <View style={styles.iconContainer}>{renderIcon()}</View>
                {isFocused && <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      <View style={[styles.centerButtonContainer, { left: BAR_WIDTH / 2 - 31 }]}>
        <TouchableOpacity 
          style={[styles.centerButton, { backgroundColor: colors.accent }]} 
          onPress={() => navigation?.navigate('robot')}
        >
          <RobotIcon size={32} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { 
    position: 'absolute', 
    left: FLOATING_PADDING, 
    right: FLOATING_PADDING, 
    backgroundColor: 'transparent', 
    overflow: 'visible', 
    elevation: 8,
    flex: 1 
  },
  innerBarContainer: { 
    position: 'relative', 
    borderRadius: 30,
    overflow: 'hidden', 
    backgroundColor: 'transparent',
    width: '100%' 
  },
  itemsContainer: { 
    flexDirection: 'row', 
    width: '100%' 
  },
  tabItem: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  spacerItem: { 
    flex: 1 
  },
  iconContainer: { 
    height: 28,
    width: 28,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  centerButtonContainer: { 
    position: 'absolute', 
    width: 62,
    height: 62,
    zIndex: 10, 
    justifyContent: 'center', 
    left: (BAR_WIDTH / 2) - 31,
    alignItems: 'center'
  },
  centerButton: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3,
    borderColor: '#ffffff',
    marginTop: -22
  },
  activeIndicator: { 
    width: 16,
    height: 2.5,
    borderRadius: 1.25,
    marginTop: 3
  }
});
