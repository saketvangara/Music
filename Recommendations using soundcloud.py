# -*- coding: utf-8 -*-
import sys
import urllib2
import urllib
import re
from urllib import urlopen
import json 
import difflib
import pymysql
import youtube_dl
from apiclient.discovery import build
from apiclient.errors import HttpError
from oauth2client.tools import argparser
import time
import soundcloud
from urllib import quote_plus
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
from random import randint	
import string	
from collections import defaultdict	
from urllib import quote_plus
from time import sleep

#var = raw_input("Enter your SoundCloud user name: ")
#print "Fetching details for ",var	

sc_client_id = 'e9254de57c63214abef885f505100d91'	
sc_resolve_api='http://api.soundcloud.com/resolve?url=http://soundcloud.com/'


#get_user_details=sc_resolve_api+var+'&client_id='+sc_client_id
#get_user_details=urlopen(get_user_details).read()
#user_details_json=json.loads(get_user_details)
#user_id=user_details_json['id']
#sc_favorites_api='http://api.soundcloud.com/users/'+str(user_id)+'/favorites?client_id=e9254de57c63214abef885f505100d91&linked_partitioning=1'
#get_user_favourites=urlopen(sc_favorites_api).reand()
#user_favourites_json=json.loads(get_user_favourites)
#print(user_favourites_json)
user_favourites_list=[91973494,132838786]

for i in user_favourites_json['collection']:
    fav_track_id=i['id']
    user_favourites_list.append(fav_track_id)

if 'next_href' in user_favourites_json:
    next_href=user_favourites_json['next_href']
else:
    next_href=None
    
while True:
    if next_href is not None:
        get_user_favourites=urlopen(next_href).read()
        user_favourites_json=json.loads(get_user_favourites)
        print(user_favourites_json)
        for i in user_favourites_json['collection']:
            fav_track_id=i['id']
            user_favourites_list.append(fav_track_id)        
        if 'next_href' in user_favourites_json:
            next_href=user_favourites_json['next_href']
        else:
            next_href=None    
    else:
        print("All favourites retrieved")
        break


sc_favourite_api='https://api-v2.soundcloud.com/tracks/'

recommended_playlists=[]
for item in  user_favourites_list:
    get_playlist_ids_api= sc_favourite_api+str(item)+'/playlists?client_id=e9254de57c63214abef885f505100d91&linked_partitioning=1&limit=100'
    get_other_tracks= urlopen(get_playlist_ids_api).read()
    get_other_tracks=json.loads(get_other_tracks)
    print(get_other_tracks)
    for playlist in get_other_tracks['collection']:
        if playlist['likes_count']>=2 or playlist['reposts_count']>=2:
            recommended_playlist_id= playlist['id']
            recommended_playlists.append(recommended_playlist_id)
        else:
            pass            
    if 'next_href' in  get_other_tracks:               
        next_playlist_href=get_other_tracks['next_href']
    else:
        next_playlist_href=None
    while True:
        if next_playlist_href is not None:
           get_other_tracks=urlopen(next_playlist_href+'&client_id=e9254de57c63214abef885f505100d91&linked_partitioning=1').read()
           get_other_tracks=json.loads(get_other_tracks)
           print(get_other_tracks)
           for playlist in get_other_tracks['collection']:
               if playlist['likes_count']>=2 or playlist['reposts_count']>=2:
                       recommended_playlist_id= playlist['id']
                       recommended_playlists.append(recommended_playlist_id)
               else:
                   pass            
           if 'next_href' in  get_other_tracks:               
               next_playlist_href=get_other_tracks['next_href']
           else:
               next_playlist_href=None
        else:
            print("All recommended tracks retrieved")
            break        

print(recommended_playlists)



sc_playlists_api='http://api.soundcloud.com/playlists/'


recommended_tracks=[]
for new_playlist in recommended_playlists:
     playlist_tracks=sc_playlists_api+str(new_playlist)+'?client_id=e9254de57c63214abef885f505100d91&linked_partitioning=1'
     get_recommended_tracks=urlopen(playlist_tracks).read()
     get_recommended_tracks=json.loads(get_recommended_tracks)
     print(get_recommended_tracks)
     for rec_track in get_recommended_tracks['tracks']:
         rec_track_id=rec_track['id']
         recommended_tracks.append(rec_track_id)       


print recommended_tracks
            
        
                
