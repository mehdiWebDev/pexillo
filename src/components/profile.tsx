"use client";

import { useState, useRef, useEffect } from "react";
import { useUserQuery } from "@/src/hooks/useUserQuery";
import { User, Settings, LogOut, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { clearUser } from "@/src/store/slices/authSlice";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from 'next-intl';

interface UserProfile {
    id: string;
    email?: string;
    [key: string]: unknown;
}

interface ProfileDropdownProps {
    user: UserProfile;
}

export function Profile({ user }: ProfileDropdownProps) {
    const { data: profile } = useUserQuery(user?.id);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const dispatch = useDispatch();
    const t = useTranslations('common');
    const t2 = useTranslations('navigation');

    // Logout function
    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        dispatch(clearUser());
        setIsDropdownOpen(false);
        router.push("/auth/login");
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleProfileClick = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleMenuItemClick = () => {
        setIsDropdownOpen(false);
    };

    const profileContent = !profile?.avatar_url ? (
        <div className="profile-icon profile-icon--placeholder">
            <div className="profile-icon__avatar">
                <User size={20} className="profile-icon__user-icon" />
            </div>
        </div>
    ) : (
        <div className="profile-icon profile-icon--image">
            <div className="profile-icon__avatar">
                <Image
                    src={profile?.avatar_url || ""}
                    alt={profile?.full_name || "User avatar"}
                    width={40}
                    height={40}
                    className="profile-icon__image"
                />
            </div>
        </div>
    );

    return (
        <div className="profile-dropdown !hidden md:!block" ref={dropdownRef}>
            <button
                onClick={handleProfileClick}
                className="profile-dropdown__trigger"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                aria-label="User menu"
            >
                {profileContent}
            </button>

            {isDropdownOpen && (
                <div className="profile-dropdown__menu">
                    <div className="profile-dropdown__header">
                        <div className="profile-dropdown__user-info">
                            {profile?.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt={profile?.full_name || "User"}
                                    width={32}
                                    height={32}
                                    className="profile-dropdown__avatar"
                                />
                            ) : (
                                <div className="profile-dropdown__avatar profile-dropdown__avatar--placeholder">
                                    <User size={16} />
                                </div>
                            )}
                            <div className="profile-dropdown__details">
                                <div className="profile-dropdown__name">
                                    {profile?.full_name || user?.email || "User"}
                                </div>
                                {user?.email && (
                                    <div className="profile-dropdown__email">
                                        {user.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="profile-dropdown__divider"></div>

                    <div className="profile-dropdown__items">
                        <Link
                            href="/profile"
                            className="profile-dropdown__item"
                            onClick={handleMenuItemClick}
                        >
                            <UserCircle size={16} />
                            <span>{t2('myProfile')}</span>
                        </Link>

                        <Link
                            href="/settings"
                            className="profile-dropdown__item"
                            onClick={handleMenuItemClick}
                        >
                            <Settings size={16} />
                            <span>{t2('accountSettings')}</span>
                        </Link>
                    </div>

                    <div className="profile-dropdown__divider"></div>

                    <div className="profile-dropdown__items">
                        <button
                            onClick={handleLogout}
                            className="profile-dropdown__item profile-dropdown__item--danger"
                        >
                            <LogOut size={16} />
                            <span>{t('logout')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}