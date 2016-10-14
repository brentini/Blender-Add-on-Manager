require 'openssl'
#OpenSSL::SSL::VERIFY_PEER = OpenSSL::SSL::VERIFY_NONE

require 'nokogiri'
require 'mechanize'
require 'uri'

agent = Mechanize.new
agent.set_proxy('10.0.58.88', '8080', 'a.nukariya%40jp.fujitsu.com', '0000121278')
agent.agent.http.verify_mode = OpenSSL::SSL::VERIFY_NONE
agent.get('https://github.com/login') do |page|
    form = page.forms[0]
    form.login = 'pen-develop'
    form.password = 'meto234lin'
    login_page = form.submit form.buttons.first
    #puts page.body
    
    params = URI.encode_www_form({
        q: 'bl_info',
        type: 'Code',
        ref: 'searchresults',
        p: 1})
    url = URI.parse("https://github.com/search?#{params}")
    agent.get(url) do |result|
        puts result.body
    end
    #doc = Nokogiri::HTML(login_page.content.toutf8)
    #h1_text = doc.xpath('//h1').text
end

