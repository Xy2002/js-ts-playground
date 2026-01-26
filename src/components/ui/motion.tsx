/**
 * Motion components - Framer Motion wrappers for Vercel-style animations
 * Subtle, refined animations that enhance without distracting
 */

import { type HTMLMotionProps, motion, type Variants } from "framer-motion";
import { forwardRef } from "react";

// Animation variants with Vercel-style ease curves
export const fadeInVariants: Variants = {
	hidden: { opacity: 0, y: 4 },
	visible: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -4 },
};

export const scaleInVariants: Variants = {
	hidden: { opacity: 0, scale: 0.98 },
	visible: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.98 },
};

export const slideInFromLeft: Variants = {
	hidden: { opacity: 0, x: -20 },
	visible: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: -20 },
};

export const slideInFromRight: Variants = {
	hidden: { opacity: 0, x: 20 },
	visible: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: 20 },
};

// Stagger children animation
export const staggerContainer: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.1,
		},
	},
};

// Common animation props
const defaultTransition = {
	type: "spring" as const,
	damping: 25,
	stiffness: 200,
};

const easeOutTransition = {
	duration: 0.2,
	ease: [0.16, 1, 0.3, 1] as const,
};

/**
 * MotionDiv - A div with subtle fade-in animation
 */
export const MotionDiv = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
	(props, ref) => {
		return (
			<motion.div
				ref={ref}
				initial="hidden"
				animate="visible"
				variants={fadeInVariants}
				transition={easeOutTransition}
				{...props}
			/>
		);
	},
);
MotionDiv.displayName = "MotionDiv";

/**
 * MotionCard - Card component with refined hover animation
 */
export const MotionCard = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
	(props, ref) => {
		return (
			<motion.div
				ref={ref}
				initial="hidden"
				animate="visible"
				whileHover={{ y: -1 }}
				variants={scaleInVariants}
				transition={defaultTransition}
				className={`card-hover ${props.className || ""}`}
				{...props}
			/>
		);
	},
);
MotionCard.displayName = "MotionCard";

/**
 * MotionButton - Button with press animation
 */
export const MotionButton = forwardRef<
	HTMLButtonElement,
	HTMLMotionProps<"button">
>((props, ref) => {
	return (
		<motion.button
			ref={ref}
			whileTap={{ scale: 0.98 }}
			whileHover={{ scale: 1.02 }}
			transition={defaultTransition}
			className={`press-scale ${props.className || ""}`}
			{...props}
		/>
	);
});
MotionButton.displayName = "MotionButton";

/**
 * MotionSection - Section with stagger animation for children
 */
export const MotionSection = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
	(props, ref) => {
		return (
			<motion.section
				ref={ref}
				initial="hidden"
				animate="visible"
				variants={staggerContainer}
				{...props}
			/>
		);
	},
);
MotionSection.displayName = "MotionSection";

/**
 * PageTransition - Wraps page content with fade transition
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
	return (
		<motion.div
			initial="hidden"
			animate="visible"
			exit="exit"
			variants={fadeInVariants}
			transition={easeOutTransition}
		>
			{children}
		</motion.div>
	);
}

/**
 * SlideInPanel - For side panels and drawers
 */
export function SlideInPanel({
	children,
	direction = "right",
	className = "",
}: {
	children: React.ReactNode;
	direction?: "left" | "right";
	className?: string;
}) {
	const variants = direction === "left" ? slideInFromLeft : slideInFromRight;
	return (
		<motion.div
			initial="hidden"
			animate="visible"
			exit="hidden"
			variants={variants}
			transition={easeOutTransition}
			className={className}
		>
			{children}
		</motion.div>
	);
}
